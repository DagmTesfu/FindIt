import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

// Real PostgreSQL execution in WASM. Auth/storage stubs represent Supabase's
// platform tables; the application's actual migration runs without rewriting.
const db = new PGlite();
const buyer = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const admin = "33333333-3333-4333-8333-333333333333";
let requestId: string;
let offerId: string;
let dealId: string;
async function asUser(id: string) {
  await db.exec(
    `reset role; set role authenticated; select set_config('request.jwt.claim.sub', '${id}', false);`,
  );
}
async function query(sql: string, params: unknown[] = []) {
  return (await db.query(sql, params)).rows as Record<string, unknown>[];
}
beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth,storage to authenticated,anon;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant select,insert,delete on storage.objects to authenticated;
    create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;
  `);
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202611150001_initial.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    `insert into auth.users(id,raw_user_meta_data) values ('${buyer}','{"name":"Buyer"}'),('${other}','{"name":"Other"}'),('${admin}','{"name":"Admin","role":"admin"}');`,
  );
  // Metadata cannot assign an admin role. Only the database owner may bootstrap it.
  expect(
    (await query("select role from public.profiles where id=$1", [admin]))[0]
      .role,
  ).toBe("buyer");
  await db.query("update public.profiles set role='admin' where id=$1", [
    admin,
  ]);
}, 30000);
afterAll(async () => {
  await db.close();
});
describe(
  "database authorization and request-to-deal workflow",
  () => {
    it("saves a request and blocks forged status and role changes", async () => {
      await asUser(buyer);
      const rows = await query(
        `insert into public.requests(buyer_id,title,category,details,condition,budget,difficulty,readiness,location,contact) values($1,'Calculator','Study essentials','Original scientific calculator','either',2500,'Cannot find an original','ready','AAU 5 Kilo','@buyer') returning id`,
        [buyer],
      );
      requestId = String(rows[0].id);
      await expect(
        db.exec("update public.profiles set role='admin'"),
      ).rejects.toThrow();
      await expect(
        db.exec("update public.requests set status='matched'"),
      ).rejects.toThrow();
      await expect(
        db.query("select public.create_offer($1,$2)", [requestId, {}]),
      ).rejects.toThrow("Admin access required");
    });
    it("hides another buyer’s request and rejects access through RPCs", async () => {
      await asUser(other);
      expect(await query("select * from public.requests")).toHaveLength(0);
      await expect(
        db.query("select public.set_request_status($1,'closed','not mine')", [
          requestId,
        ]),
      ).rejects.toThrow("Request unavailable");
      await expect(
        db.query(
          "insert into public.messages(request_id,sender_id,body) values($1,$2,$3)",
          [requestId, other, "Not my conversation"],
        ),
      ).rejects.toThrow();
    });
    it("keeps sourcing notes private and requires buyer confirmation", async () => {
      await asUser(admin);
      await db.query(
        "insert into public.sourcing_notes(request_id,body,cost) values($1,'Private supplier information',1800)",
        [requestId],
      );
      await db.query(
        "select public.set_request_status($1,'awaiting_confirmation',null)",
        [requestId],
      );
      await expect(
        db.query("select public.confirm_interest($1)", [requestId]),
      ).rejects.toThrow("Request unavailable");
      await asUser(buyer);
      expect(await query("select * from public.sourcing_notes")).toHaveLength(
        0,
      );
      await db.query("select public.confirm_interest($1)", [requestId]);
      expect(
        (await query("select status,confirmed_at from public.requests"))[0]
          .confirmed_at,
      ).toBeTruthy();
    });
    it("creates an offer and protects price from direct edits", async () => {
      await asUser(admin);
      const result = await query("select public.create_offer($1,$2) as id", [
        requestId,
        {
          item: "Casio fx-991EX",
          details: "New, original calculator in packaging",
          total: 2200,
          fulfillment: "Pickup at 5 Kilo on Friday",
          terms: "Inspect at pickup; cancel before sourcing purchase.",
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        },
      ]);
      offerId = String(result[0].id);
      await expect(
        db.exec("update public.offers set total=1"),
      ).rejects.toThrow();
      await asUser(other);
      expect(await query("select * from public.offers")).toHaveLength(0);
      await expect(
        db.query("select public.respond_offer($1,true)", [offerId]),
      ).rejects.toThrow("Offer unavailable");
    });
    it("accepts idempotently and leaves payment unpaid", async () => {
      await asUser(buyer);
      dealId = String(
        (
          await query("select public.respond_offer($1,true) as id", [offerId])
        )[0].id,
      );
      expect(
        (
          await query("select public.respond_offer($1,true) as id", [offerId])
        )[0].id,
      ).toBe(dealId);
      const deals = await query("select * from public.deals");
      expect(deals).toHaveLength(1);
      expect(deals[0].payment).toBe("unpaid");
      await expect(
        db.query("select public.update_deal($1,'completed','paid','fake')", [
          dealId,
        ]),
      ).rejects.toThrow("Admin access required");
    });
    it("requires verified payment and delivery evidence before completion", async () => {
      await asUser(admin);
      await expect(
        db.query(
          "select public.update_deal($1,'completed','unpaid','delivered')",
          [dealId],
        ),
      ).rejects.toThrow("Verify payment");
      await expect(
        db.query("select public.update_deal($1,'completed','paid','')", [
          dealId,
        ]),
      ).rejects.toThrow("Record delivery");
      await db.query(
        "select public.update_deal($1,'completed','paid','Buyer confirmed pickup in person')",
        [dealId],
      );
      await expect(
        db.query("select public.update_deal($1,'accepted','paid','reopen')", [
          dealId,
        ]),
      ).rejects.toThrow("cannot be reopened");
      expect((await query("select status from public.deals"))[0].status).toBe(
        "completed",
      );
    });
    it("rejects expired offers and cancellation of a matched request", async () => {
      await asUser(buyer);
      await expect(
        db.query("select public.set_request_status($1,'closed','cancel')", [
          requestId,
        ]),
      ).rejects.toThrow("can no longer");
      await db.exec("reset role");
      const rows = await query(
        `insert into public.requests(buyer_id,title,category,details,condition,budget,difficulty,readiness,location,contact,status) select buyer_id,title,category,details,condition,budget,difficulty,readiness,location,contact,'offer_sent' from public.requests where id=$1 returning id`,
        [requestId],
      );
      const expiredRequest = rows[0].id;
      const expired = await query(
        `insert into public.offers(request_id,item,details,total,fulfillment,terms,expires_at) values($1,'Expired item','A complete description',100,'Pickup tomorrow','Inspect before payment',now()-interval '1 day') returning id`,
        [expiredRequest],
      );
      await asUser(buyer);
      await expect(
        db.query("select public.respond_offer($1,true)", [expired[0].id]),
      ).rejects.toThrow("expired");
      await db.query(
        "select public.set_request_status($1,'closed','No longer needed')",
        [expiredRequest],
      );
      expect(
        (
          await query("select status from public.offers where id=$1", [
            expired[0].id,
          ])
        )[0].status,
      ).toBe("withdrawn");
    });
    it("restricts private image access to its owner and related buyer", async () => {
      await db.exec("reset role");
      await db.query(
        "insert into storage.objects(bucket_id,name) values($1,$2)",
        ["request-images", `${admin}/offer.jpg`],
      );
      await db.query("update public.offers set image_path=$1 where id=$2", [
        `${admin}/offer.jpg`,
        offerId,
      ]);
      await asUser(buyer);
      expect(await query("select * from storage.objects")).toHaveLength(1);
      await asUser(other);
      expect(await query("select * from storage.objects")).toHaveLength(0);
      await expect(
        db.query("insert into storage.objects(bucket_id,name) values($1,$2)", [
          "request-images",
          `${buyer}/forged.jpg`,
        ]),
      ).rejects.toThrow();
    });
  },
);


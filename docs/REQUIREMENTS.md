# First-release scope

## Business

Capture hard-to-find buying demand, prioritize recently confirmed buyers, source items manually, disclose all costs in an offer, and complete a traceable deal. No spending or payment occurs merely by submitting a request.

## Student

Sign in, submit item/category/details/condition/budget/deadline/readiness/location/contact, attach a reference image, see status, confirm interest, exchange messages, review/accept/decline an offer, cancel an unmatched request, and follow payment/fulfillment updates. Students cannot see anyone else's requests or internal supplier costs.

## Operator

Review/search/filter requests, request confirmation, mark sourcing, record private supplier information and estimated costs, create a complete expiring offer, arrange manual payment/delivery, record verification and completion, and close requests with a reason.

## Invariants

- An offer includes a total price including all fees/delivery, item details/condition, fulfillment timing, terms, and expiry.
- An expired, withdrawn, declined, or closed-request offer cannot be newly accepted.
- Acceptance is atomic and repeat-safe; it creates one unpaid deal.
- Only the buyer can accept their offer or confirm their interest.
- Accepted terms remain unchanged; clients cannot directly edit prices.
- Only admins verify payment and fulfillment. Completion requires paid status and a note confirming delivery/pickup.
- No frontend-only authorization. Database policies and functions enforce all permissions.
- Demo mode must always be explicit and visibly labelled.

## Deferred

Buyer request editing/version history, password recovery UI, automated in-app unread notifications, external notifications, reporting/actual profit bookkeeping, pagination, anti-abuse controls, and integrated payments. The first pilot uses manual follow-up and sourcing notes. These are explicit scope boundaries, not hidden working features.

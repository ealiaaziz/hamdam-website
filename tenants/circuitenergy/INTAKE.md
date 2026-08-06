# Environment intake

Send this to the customer's contact before the desk goes live. Every answered
section becomes one file in that tenant's `kb/reference/`, cited as
`source: INTAKE.md (completed <date>, confirmed by <name>)`.

Two rules make this document worth the trouble rather than a formality:

**Leave blanks blank.** A section nobody could answer becomes no reference
file, and the assistant then says it does not know and hands the ticket to a
person. That is the correct outcome. A guess becomes a reference file that
sounds researched and is wrong, which is the failure mode this whole structure
exists to prevent.

**It gets a date and a name.** "Somebody said so on the phone in August" is
not a source. A signed document is, and it is what a reference file points at
when somebody asks in a year's time why the desk believes something.

---

## 1. Who they are

- Business name, as staff would write it:
- Email domains staff send from (all of them, including any old ones still in use):
- Website:
- Head office location and working hours:
- Who is the day to day contact for IT decisions:
- Who may authorise a password reset or a new account:

> Becomes `reference/organisation.md`. The domain list is not decoration: it
> is what the desk uses to recognise a requester, so an old domain left off
> means those staff cannot raise a ticket.

## 2. Staff

- Names, work email addresses, and roles:
- Anyone who should be treated as urgent by default (director, on call):
- Anyone who is not an employee but should still be able to raise tickets
  (contractor, bookkeeper, external accountant):
- Expected headcount over the next year:

> Becomes `reference/people.md`, and the address list is what goes into the
> requester allowlist. Nobody outside it can open a ticket.

## 3. Accounts and sign-in

- Microsoft 365, Google Workspace, or something else:
- Tenant or primary domain for that service:
- Is self-service password reset switched on:
- Is multi-factor authentication required, and by what method:
- Who holds administrator access:
- Is there single sign-on into anything else:

> Becomes `reference/accounts-and-sign-in.md`. The self-service answer is the
> one that decides whether the password article tells somebody to reset it
> themselves or to write in, so it is worth being exact.

## 4. Devices

- Windows, Mac, or both, and roughly how many:
- Are they managed (Intune, Jamf, something else) or standalone:
- Who owns them, the business or the individual:
- Are staff local administrators on their own machines:
- Mobile phones: work issued or personal:

> Becomes `reference/devices.md`.

## 5. Network

- Internet provider and rough speed at each site:
- Is there a VPN, and which one:
- Who supplied and supports the firewall or router:
- Is there guest wifi, and is it separate from the staff network:
- Any site to site links between offices:

> Becomes `reference/network.md`.

## 6. Printers and shared equipment

- Make and model of each printer, and where it lives:
- Is it networked or connected to one machine:
- Anything else shared: scanners, NAS, meeting room equipment:

> Becomes `reference/printers-and-equipment.md`.

## 7. Line of business applications

For each application the business actually runs on:

- Name and what it is used for:
- Cloud or installed:
- Who supports it, and is there a support contract or account number:
- Who inside the business knows it best:

> Becomes `reference/applications.md`. This is usually the section that
> matters most and the one people forget, because the software they use every
> day is invisible to them.

## 8. Data and backup

- Where do working files live: SharePoint, OneDrive, a server, local disks:
- What is backed up, by what, and how often:
- Has a restore ever been tested:
- Anything with a legal or contractual retention requirement:

> Becomes `reference/data-and-backup.md`. Answer the restore question
> honestly. "Never tested" is a normal answer and a useful one.

## 9. Security posture

- Antivirus or endpoint protection in use:
- Is MFA enforced on every account, including shared mailboxes and admins:
- Any conditional access or country restrictions:
- Has there been a security incident before, and what happened:
- Cyber insurance, and does the policy require anything specific:

> Becomes `reference/security-posture.md`.

## 10. Support expectations

- Hours the desk is expected to answer:
- What counts as urgent to this business, in their own words:
- Who gets told when something is escalated:
- Anything explicitly out of scope:

> Becomes `reference/support-scope.md`, and it is also what the priority rules
> are tuned against. "Urgent" means something different in every business and
> guessing it produces either constant false alarms or a missed one that
> mattered.

---

## After it comes back

1. Write one reference file per answered section. Keep them short and factual:
   how things are, not what to do about them.
2. Anything the contact was unsure about goes in as a gap, not as a fact.
   Ask again later rather than writing a maybe.
3. Re-run the intake yearly, and after any move, migration or new application.
   A reference file that has quietly gone out of date is indistinguishable
   from one that was wrong to begin with.

# docrag-chat

## Problem
Employees at a company keep losing time searching internal documents (policies, manuals, procedures) to learn something or check a fact, and they repeat the same search many times. External AI tools are not an acceptable home for internal documents, and they cannot be customized to the company. Leaving this unsolved means slow answers, repeated interruptions, and decisions made on unchecked information.

## Evidence
- Assumption — needs validation via user research (observe and time colleagues at the owner's current job finding answers in internal documents).
- Assumption — needs validation via user research: which document types and formats the target company actually holds.

## Users
- **Primary**: an employee of one company who needs to learn or check something written in the company's internal documents. The trigger is a concrete question during their work.
- **Secondary**: a company admin who curates the document library and manages who has access.
- **Not for**: anonymous or public visitors (nothing is reachable without login); several companies sharing one installation.

## Hypothesis
We believe **a private, login-only chat that answers from the company's own documents, with citations to the source passages** will **cut the time employees spend searching for internal information** for **employees of a single company**.
We'll know we're right when **an employee finds a cited answer in under 1 minute where it used to take 10+ minutes, and colleagues keep using it weekly for a month**.

## Success Metrics
| Metric | Target | How measured |
|---|---|---|
| Time to a trusted answer | < 1 min (baseline ~10+ min, TBD — needs validation via timing colleagues today) | Time the same real questions with and without the tool |
| Sustained use | N colleagues weekly for 4 consecutive weeks (N TBD — needs validation once a pilot group is known) | Count of distinct users with at least one conversation per week |
| Retrieval quality | TBD — needs validation via a set of real questions with known source passages | Share of test questions where the answer cites the correct passage; share of out-of-library questions answered "not found" |
| Answer language | 100% of answers in the language of the question (English or Portuguese) | Test question set in both languages |

## Quality Requirements (must)
- **Retrieval quality is the core requirement.** Answers come only from the company's documents, cite the passages they used, and say clearly when the documents don't contain the answer, rather than guessing.
- **Well-structured answers**: easy to scan (direct answer first, then supporting detail and sources).
- **Language follows the question**: a question in Portuguese gets an answer in Portuguese, and one in English gets an answer in English, whatever language the source documents are in.
- **Login required for everything**: no page, document or answer is reachable without logging in.

## Scope
**MVP**: one company space. Admins upload internal documents. Logged-in employees hold a conversation with follow-up questions and get answers with citations, or a clear "not found in the documents". This covers M1–M3.

**Out of scope**
- Multi-tenant (several companies in one installation): each company runs its own installation.
- Anonymous or public access: it's an internal tool.

## Delivery Milestones
<!-- Business outcomes in delivery order. Status: pending | in-progress | complete -->
| # | Milestone | Outcome | Status | Plan |
|---|---|---|---|---|
| M1 | Team access | Employees and admins log in with their own accounts; admins manage users; nothing is reachable without login | in-progress | F001, F002 |
| M2 | Document library | An admin uploads internal documents, sees each listed as ready or failed, and can remove them | pending | — |
| M3 | Conversational answers with citations | An employee chats with the library: asks a question, then follow-ups that keep context, and gets structured answers in their own language citing source passages (or "not found"). Past conversations are saved and can be reopened | pending | — |
| M4 | On-premise mode | Everything, including the AI, runs inside the company's own infrastructure, so no document content leaves it | pending | — |

## Open Questions
- [ ] Before M4, are M1–M3 allowed to send document content to an external AI provider? This decides whether a pilot on real company documents can happen before M4.
- [ ] Should some employees see only some documents (per-document or per-group permissions), or does everyone see the whole library?
- [ ] Which document formats must be supported (PDF, DOCX, scanned PDFs, wiki exports)? How many documents, and how large?
- [ ] How much answer quality is "good enough" to trust? What is the retrieval-quality target once the test question set exists?
- [ ] Still undecided whether these are in or out of scope: syncing from external drives or wikis (Drive, SharePoint, Confluence), editing documents in the app, mobile apps.
- [ ] Is the M4 local AI accurate enough in Portuguese and English to meet the quality requirements?

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Retrieval quality isn't good enough, so employees stop trusting answers | Medium | High | Build a real question set with known answers early in M3, and measure against it before calling M3 complete |
| Confidential documents reach an external AI provider before M4 | Medium | High | Answer the first open question before piloting with real documents; use non-confidential documents until then |
| The local AI in M4 gives noticeably worse answers than M1–M3 did | Medium | Medium | Run the same question set against M4 and compare with the M3 results |
| Documents in poor formats (scans, complex tables) can't be read well | Medium | Medium | Check real sample documents during M2; report "failed" clearly instead of indexing them silently |
| No pilot group at the job, so success can't be measured | Medium | Medium | Name the pilot colleagues before M3 ends |

---
*Status: DRAFT — requirements only.*

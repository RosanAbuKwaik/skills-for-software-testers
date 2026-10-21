# Quality criteria for requirements

Used by the `analyzing-requirements` skill when it reviews a requirement as a test basis. In this
skill, a **defect** is a defect in the requirement; a defect in the product is always called a
**product defect**.

## Contents
- Defect types
- Quality attributes
- Vague words
- Testability check
- Prioritization
- Change impact analysis
- Recording a finding
- Sources and confidence

## Defect types
Test analysis evaluates the test basis for these kinds of defects:

| Type | Meaning | Example |
|---|---|---|
| Ambiguity | More than one reasonable reading | "The page loads fast" |
| Omission | Needed information or behaviour is missing | no error case, no limit, no default |
| Inconsistency | Two statements or documents differ | a ticket and its mockup disagree |
| Inaccuracy | A statement is wrong or outdated | an example with a wrong number |
| Contradiction | Two statements cannot both be true | "required" here, "optional" there |
| Superfluous statement | Not needed, duplicated, or gold-plating | the same rule written twice |

## Quality attributes
Check each attribute and record every failure with the statement ID. These come from
requirement-quality standards, not from the ISTQB defect list; use them next to it.

### Per statement
| Attribute | Question to ask | Typical defect |
|---|---|---|
| Unambiguous | Can two people read it differently? | Ambiguity |
| Atomic | Is it one rule, or several joined by "and"? | Superfluous, untestable |
| Testable | Can I state an input, an action and an observable expected result? | Omission |
| Correct | Does it match the other facts, numbers and examples? | Inaccuracy |
| Feasible | Can it be built and tested within known technical and business limits? | Question for the owner |
| Necessary | Does it serve a stated need, or is it extra? | Superfluous |

### Per set of statements
| Attribute | Question to ask | Typical defect |
|---|---|---|
| Complete | Is anything needed missing (actors, preconditions, limits, errors, states, permissions)? | Omission |
| Consistent | Do the statements and the sources agree with each other? | Inconsistency, contradiction |
| Traceable | Can each statement be traced to a source and, later, to test conditions and cases? | Missing source or ID |
| Prioritized | Does each statement or feature have a priority or a reason to rank it? | Missing priority |

## Vague words
Flag these: fast, quickly, soon, real-time, easy, simple, user-friendly, intuitive, flexible,
robust, appropriate, adequate, optimal, minimal, large, small, many, some, several, usually,
normally, as needed, if possible, etc., and so on, and/or, should, may, support, handle, process,
similar, TBD, a pronoun with no clear referent, and any domain term the source never defines
(status names, user types, roles).
A flagged word is a defect only when it hides a rule the tests need.

## Testability check
For each statement answer:
- **Input and action**: what does the user or the system do?
- **Expected result**: what exactly is observed (a text, a number, a state, a message)?
- **Where it is observed**: UI, API response, database, e-mail, log, another system?
- **Needs**: test data, an account or role, an environment, time or a clock change, a third party.
- **Side effects**: does checking it send an e-mail, create or change records, or cost money?

Verdict per statement: **Testable**, **Testable with needs** (list them), or **Not testable** (say
why). Do not mark a statement testable without an observable expected result.

## Prioritization
- Rank test conditions by risk (likelihood x impact) and by business value.
- If the requirement already has priorities (must/should/could, a ticket priority), keep them as
  given and show them.
- If it has none, do not present an invented priority as a fact. Propose High, Medium or Low with a
  one-line reason, label it "proposed", and add "confirm the priority" to the questions.

## Change impact analysis
Run this only when the requirement changes, extends, replaces or removes existing behaviour, or
migrates data.
1. State what changes (old behaviour to new behaviour) and what must stay the same.
2. List what could be affected: features that share code or data, roles and permissions, data and
   migrations, integrations and APIs, e-mails and notifications, reports and analytics, texts and
   translations, configuration, performance and security.
3. Suggest regression candidates: the areas and existing tests worth re-running, with the reason
   for each.
4. Note compatibility, rollout and rollback concerns if the source mentions them.
5. Mark each item **observed** (seen in the source), **inferred**, or **unknown**, and turn every
   unknown into a question. Do not describe current system behaviour you have not seen.

## Recording a finding
One line per finding, in this shape:
`<ID> | <statement ID> | <defect type or attribute> | <short description> | <why it matters for testing> | <question or suggested option>`
Keep quotes short, cite the source (document, section, frame or comment), and separate what the
source says from what you infer.

## Sources and confidence
- Defect types, prioritization by risk, and change impact analysis follow the ISTQB Foundation
  Level (CTFL v4.0) chapters on test analysis, risk management and maintenance testing. The
  wording here was written from memory and has not been checked against the syllabus text.
- The quality attributes follow IEEE 830 and ISO/IEC/IEEE 29148.
- Check the ISTQB items against the syllabus before publishing this file.

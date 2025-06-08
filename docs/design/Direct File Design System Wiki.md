# **Direct File Design System Wiki**

A single source of truth to design system decisions and a collection of design rules and patterns for IRS Direct File.

## **Built with USWDS**

Direct File is built using the [U.S. Web Design System](https://designsystem.digital.gov/how-to-use-uswds/):

* Any modifications should follow guidelines established through USWDS to ensure an accessible, mobile-friendly product.

* We will consider current IRS.gov site mental models only as a reference.

* Other useful references are [design.cms.gov](https://design.cms.gov/?theme=core) and [design.va.gov](http://design.va.gov), particularly if we're looking for a component not available in USWDS.

# **Taxonomy and Nicknames**

A list of names we use for elements and concepts.

For Spanish Translation Glossary see Spanish Glossary Folder in Wiki folder.

## **A**

**Assertion**

DF figures results based on user inputs and then actively tells them ("asserts") the result. We call the point in the experience when DF tells the user a result, an assertion. Examples are: filing status eligibility, standard deduction amount, credit eligibility, taxable income, refund/owed calculation, and many more.

**Assertion model**

This is Direct File's core behavior. Part of the Direct File product vision is to address the burden and uncertainty of having to understand and apply tax rules to ones own situation by instead asking questions that demonstrate the user's eligibility or lead to the result we're trying to calculate and then telling them the outcome (asserting it to them).

## **B**

**Bites**

Edibles: Bites, snacks, and meals combine text, links, and modals in layers of progressive disclosure to give the taxpayer additional context and provide hints and additional information for taxpayers. They help answer questions they may have about how to fill out Direct File.

Bites are 1-2 sentences of extra context that is always visible on the page. Bites sometimes live with a link to even more information in a snack or meal.

## **C**

**Checklist**

Part of the UI. The main page of an individual return that shows a user the task before them, their work progress, and provides entry points to answer questions for their return.

**Collection**

A collection is how we refer to sets of items of a given type added to a tax return (e.g., dependents and qualifying people, W-2s, 1099-Rs, etc.). Each unique item in a collection is accessed from a collection hub UI.

**Collection hub**

A collection hub is the home UI for a given collection of items. Each hub houses one collection on the tax return, but we have flexibility on choosing how granularly we define a single collection. For example, a hub might house all items of one given type of form (e.g. "W-2s") or a category (e.g. "Investment income" inclusive of 1099-INTs and 1099-DIVs).

**Collection item**

Collection items are instances. Each collection item added creates a loop of questions needed to complete that item on the tax return. Collection items are represented on a collection hub using an item card. The item card provides access to the item's data view and management functions (edit, remove).

**Collection subsection**

A collection subsection is a type of subsection that is comprised entirely of a collection with no leading or trailing questions that exist outside of the hub and its child items.

## **D**

**Data view**

The view of the data in a given section. This is the page the user encounters at the end of a subsection of questions or if they leave and return to a subsection after having answered at least one question in the flow. It shows an overview of the answers the user saved. It's one of the main navigation structures in the experience, providing paths for reviewing and editing entries.

## **E**

## **F**

**Flow, the**

"The flow" refers to the continuous page experience in a subsection of Direct File, such as all the pages encountered on a path within "About you," "W-2," etc. The flow focuses the user on a conversational question series, guiding them to completion.

**Form page**

Form is a type of page in our system. As a UI, it houses multiple inputs on one screen. Form pages balance length with ease of data entry, meaning it shouldn't contain so many fields that it's a slog to get through or that losing the data if there's a mishap would be overly burdensome on the user, but it shouldn't be so fragmented as to chop up a data entry task into too many steps. It's a judgement call and one where usability testing is key. This page type is distinct from the Question page which only allows one question/input on a page.

## **G**

## **H**

## **I**

**Inner Collection subsection**

"Inner Collections" (aka Question-Collections) are a type of subsection. They have a structure that combines the idea of a Question subsection type and the Collection Subsection type in such a way that the subsection starts and/or ends with a run of questions, but may house a collection hub folded into the run of questions.

## **J**

## **K**

**Knockouts, knockout questions, knockout screens**

The tool needs to ask questions along the way to confirm the user's tax situation is supported.. We've been calling those questions "knockouts/knockout questions." We call the screen in the UI that informs the user that their tax situation is not supported (plus gives them options for going back or exiting the return flow) a "knockout screen."

## **L**

**Loop back task**

A loop back is a pattern we created to prompt the user to fill out information in a prior subsection that only became necessary in the task downstream of where those inputs live. This is a different scenario than an "incompletion" because we're allowing them to keep going until we know if those questions will be relevant to their return at all. The best example of a loop back in DF is in the Filing Status section. We prompt a user to fill out information about their spouse (the inputs for which live in the spouse section) in the case where DF detected that they were eligible for MFJ, MFS, and possibly HOH while they were still working in the Spouse section, and we offered them a choice. They could choose one of the two married statuses or wait to see if they were eligible for HOH. If they were, they could use it. If not, they'd have to use one of the filing statuses they did qualify for and at that point we'd need spouse information. We don't collect information unless it's necessary for the return, so creating a loop-back mechanism for situations like this is how we allow a task to roll forward gracefully for users and prompt later only if needed. See for example: more-spouse-info-a or more-spouse-info-b.

## **M**

**Meals**

Edibles: Bites, snacks, and meals combine text, links, and modals in layers of progressive disclosure to give the taxpayer additional context and provide hints and additional information for taxpayers. They help answer questions they may have about how to fill out Direct File.

Meals are links to external websites that provide more information or context taxpayers might need that won't fit into a bite or modal. They can be linked to directly from the main workflow or from within modals.

## **N**

## **O**

## **P**

**Page types**

Within the flow (meaning, the pages in a section that aren't structural UIs like a checklist, hub, data view, deletion confirmation page, etc.) are different page types that serve specific interaction functions (from an implementation perspective, these may or may not use their own template)

* Assertion

  * Determination (there are major and minor flavors of this that probably need to be broken down further)

    * add-person-special-rule-applies-custodial

    * add-person-special-rule-other-eligible-tp-outcome

    * add-person-qc-of-another-summary

    * qualified-dependent-not-claimed

    * qualified-qc-of-multiple-tps

    * qualified-dependent

    * potential-qp

    * confirmed-qp

    * not-qualified

    * mfjd-ok-1

    * mfjd-ok-2

    * mfjd-switch-not-dependent-tp

    * mfjd-ok-form-not-required

    * filing-status-assertion-single-only

    * filing-status-assertion-mfs-only

    * filing-status-assertion-hoh-best

    * filing-status-assertion-qss-best

    * filing-status-assertion-mfj-best

    * filing-status-no-choice

    * dep-care-mfj-dep-taxpayers

    * zero-qp-zero-qe

    * earned-income-rule-result-benefits

    * dep-care-exclusion-outcome

  * Math

    * hsa-contributions-summary-excess-KO

    * hsa-contributions-summary-under

    * total-income-summary

  * Knockout

    * age-ko and a million examples

  * DF action (auto-correction, import confirmations)

    * filing-status-error-autocorrect

    * jobs-data-import-breather

* Task prompt

  * total-income-summary-none-reported

  * w2-missing-state-income

  * more-spouse-info-a

* Breather

  * Acknowledgement (we reference a specific fact, situation, or choice as a way to provide more context about the thing or tee up something related that's coming next)

    * qualified-dependent-not-claimed

    * add-person-written-declaration-signed

    * qualified-dependent-ip-pin-not-ready

    * qualified-dependent-confirmation

    * exit-person-section

    * mfj-dependent-choice-a

    * mfj-dependent-choice-b

    * add-spouse-b

    * filing-status-manual-choice-first-time

    * filing-status-manual-choice

    * add-person-acknowledge-tin

    * spouse-mfj-dep-tp-intro

    * mfjd-breather

    * mfs-spouse-data-intro

    * jobs-data-import-breather-done

    * jobs-data-import-refer-W2

    * income-supported-intro

    * income-not-supported-intro

    * earned-income-rule-breather-benefits

    * provider-due-diligence

    * hsa-already-reported-w2-contributions

    * hsa-breather-about-you

  * More of a rhythm transition

    * about-you-breather

    * income-sources-breather

    * hsa-coverage-breather

    * hsa-contributions-breather

* Input

  * Form page

    * Any multi-field question

  * Manual override of assertion or biased button recommendations

    * filing-status-override

    * dep-care-combat-pay-change

  * Question page

    * Any single-input question

* Intro

  * Section intro

    * this will exist in DF 25, but implementation for DF 24 was deprioritized

  * Subsection intro

    * filing-status-intro

    * family-hh-intro-dep-tps

    * family-hh-intro-non-dep-tps

    * family-hh-intro-2

    * unemployment-loop-intro

## **Q**

**Question page**

Questions are a page type in our system. It's a screen design that isolates 1 question and its related help content on a single screen to manage cognitive load. A question page is distinct in our system from a form page, which combines multiple fields to enable easy data entry.

**Question subsection**

A question subsection is a type of subsection that is composed of questions and information pages only (no collections).

## **R**

**Review**

## **S**

**Scope flag**

Scope flags are how we let the user know a given tax situation isn't supported through content on screen, without including a knockout question for it. The difference is in the amount of work levied on the user. Judging when to use a scope flag or a knockout is a design judgment call based on avoiding unnecessary/burdensome work for most users if there is relatively low consequence and we are otherwise not providing a way to accomplish the thing in the product. Examples include: multiple support agreements, certain interest income scenarios like claiming the interest exclusion under the Education Savings Bond Program, reporting a child's Alaska Permanent Fund Dividend, etc.

**Snacks**

Edibles: Bites, snacks, and meals combine text, links, and modals in layers of progressive disclosure to give the taxpayer additional context and provide hints and additional information for taxpayers. They help answer questions they may have about how to fill out Direct File.

Snacks are medium to long-form content blocks that appear in modals, giving taxpayers more information than they would get in a bite, but less than a "meal" or fully external website.

**Soft knock-out**

superseded by the term "scope flag"

**Subway/Subway map**

superseded by the term "Checklist"

## **T**

## **U**

## **V**

## **W**

## **X**

## **Y**

## **Z**

# **Information Architecture and tax preparation task flow**

Direct File guides taxpayers through a structured tax preparation task by means of sets of questions. DF is organized according to a hub-and-spoke model, using the Checklist as the hub, with subsections linked directly from there. Subsections operate as short units of work in the larger task and always return the user to the hub to place control over the task in their hands and to regularly ground them in their progress through the larger task.The overall tax preparation task is organized into some high-level notional sections that are numbered on the checklist. Each numbered section is further organized into one or more subsections. Subsections contain the meat of the task: questions and mechanisms for data entry and structures enabling reviews and edits. Direct File has a notion of different subsection types that consist of interactions needed for collecting responses or data from the taxpayer or delivering information. These  types are: question, collection, inner collection, assertion, and review.

Task flow

Direct file uses the Checklist, subsections, and progressive disclosure/unlocks to guide the user forward through their task. DF uses data views, subsection overview pages, to enable interaction with completed work: review and edit tasks.

## **Direct File Task Flow**

Direct File uses a hub-and-spoke IA using the Checklist as the hub providing access to the task, that's divided into several steps (subsections). Direct file uses the Checklist, subsections, and a progressive disclosure/unlock scheme to guide the user forward through their task from start to finish.

### **Paths through the application**

Question subsection

*![Direct_File_TaskFlow ](https://github.com/user-attachments/assets/f26b7571-c189-4a70-99bd-3961109aa0da)

### **Review and edit**

DF uses data views, subsection overview pages, to enable interaction with completed work: review and edit tasks.

### **Tax year 24 Information Architecture**

1. Checklist

   1. You and your family

      1. About you

      2. Spouse

      3. Family and household

      4. Filing status

   2. Income

      1. Income sources

      2. Jobs

      3. Unemployment compensation

      4. Interest income

      5. Alaska Permanent Fund Dividend (conditional)

      6. Dependent care benefits

      7. Health Savings Accounts

      8. Retirement income

      9. Social Security benefits

      10. Total income

   3. Deductions\*

      1. Adjustments

      2. Standard deduction

      3. Taxable income

   4. Credits\*

      1. Premium Tax Credit (conditional)

      2. Child and Dependent Care Credit (conditional)

      3. Credit for the Elderly or the Disabled (conditional)

      4. Saver's Credit (conditional)

      5. Child Tax Credit or Credit for Other Dependents (conditional)

      6. Earned Income Tax Credit (conditional)

      7. Credits Summary

   5. Your 2024 taxes

      1. Estimated taxes paid

      2. Amount

      3. Payment method

      4. Other preferences

   6. Complete

      1. Review and confirm

      2. Print and mail (conditional)

      3. Sign and submit (conditional)

      4. Sign (conditional)

      5. Submit (conditional)

\*Note: due to time constraints for TY24, the "Deductions and Credits" section remained combined into one instead of broken out into separate sections as shown in this list illustrating the intended IA for TY24.

# **Organizing terms (internal)**

Checklist, Section, Subsection, and Hierarchical categories, Data Views

## **Checklist**

Direct File has a number of navigational screens, to help the taxpayer navigate through the various sections. The Checklist is the hub in DF's hub-and-spoke IA model. It is the home base from which a taxpayer initiates their return and each subsection of work within the larger task. It reveals all the steps of the task and provides access to them.

The Checklist is the second screen the taxpayer encounters after starting a tax return. It is the main mechanism for completing the tax preparation task.

![Checklist](https://github.com/user-attachments/assets/49fdce5a-174d-4b98-9d5e-f458af14342c)

### **About**

The Checklist is based on the USWDS process list, and displays the steps (and your progress through these steps) needed to successfully file with Direct File. Specifically, the Checklist is displaying the Sections and Subsections in DF.

### **Interaction and behavior**

Once a taxpayer selects a tax return card on the Dashboard, they're taken to the Checklist. When they first visit the page, only the first Section is available. As they complete a section intro, the next subsection is unlocked. When they finish that subsection, the next is unlocked and so on. Taxpayers can revisit/edit previous section intros/subsections at any time.

Start or Continue buttons mark where the taxpayer currently is in the overall flow.

Examples of the "start," "continue," and right-caret cues that lead taxpayers through the tasks in the checklist.

<img width="820" alt="Checklist_start_continue" src="https://github.com/user-attachments/assets/f1c639f5-91b2-41e0-af01-36812fa66fa3" />

### **Navigation**

* Taxpayers will be prompted by a Start button to begin a section or a Continue button if they have saved at least one input in a subsection, left off in their task and then came back to resume work. Those prompts change as the user progresses. They go away (for section titles) or are replaced with a right-caret (for subsection titles) when DF considers the segment has been completed.

* Taxpayers can revisit previous sections at any time by selecting the subsection title.

* Locked subsections are displayed in gray: base (\#71767a) and have no interactive elements.

* When needed, the Checklist will display a summary alert at the top of the screen, and an item cue alert under the subsection. (See more in Errors, warnings, and status messages.)

* For certain incomplete states or big changes to previous answers, the Checklist could lock down sections again to force a taxpayer to revisit a certain spot. (Example scenarios include changing marital status or having an incomplete family and household member.)

Navigation for Section-level intros

![Checklist_Section_intros](https://github.com/user-attachments/assets/76c7a5b8-9b43-4fe4-b386-5aa72c94391c)

## **Section, subsection, and sub-subsection**

## **Hierarchical categories**

In Direct File, questions are organized into 3 levels of hierarchical categories. Note that design refers to these as “sections” “subsections” etc.  and engineering sometimes refers to these as “categories” and “subcategories.”

### **1\) Section**

Sections are the top category level. On the checklist, these are the numbered headings. Examples include:

* You and your family

* Income

* Deductions

* Credits

* Your \<2023\> taxes

* Complete

Section names are prominent in Direct File and help taxpayers understand the theme of the information they'll be providing in that part of the task. Section names will evolve over the years as the tax scope grows or will remain the same if that's what fits the shape of the tax preparation task for a given tax year best.

Sections live directly below the checklist and are composed of intro pages plus at least 1 subsection. Their intro page(s) are linked directly from their titles on the checklist.

![section_structure](https://github.com/user-attachments/assets/2344c0e8-23c5-431d-a79a-c4d4be292d20)

### **2\) Subsection**

Subsections are the second category level, and provide additional context for the type of questions in that sub-category. Sections have at least 1 subsection.

Subsections are important for navigation as they provide the entry point into a segment of information/questions from the checklist. They represent the list of actions the user must complete to finish the tax preparation task. Subsections are interactive on the Checklist with a link and progress-based prompts ("start," "continue," or just a right-caret icon for revisits). Once a taxpayer has completed a subsection, subsection content (a "data reveal") will appear below the subsection title, summarizing some key information from that subsection.

![checklist_elements](https://github.com/user-attachments/assets/30d897ed-d02c-4ecd-b506-6ad8a1a3a1b4)

### **Subsection types**

There are 5 subsection types that handle different types of task within the TP's larger return preparation task. Subsections have different confirmation/review UIs depending on their type (data view, collection hub, assertion page, or a combination).

A. Question Subsection

Use this structure for subsections that contain nothing more complex than a sequence of questions.

![SUBSECTION_A](https://github.com/user-attachments/assets/106de452-fd22-408e-9e00-ffda6c31c739)

B. Collection Subsection

Use this structure for subsections that are composed of nothing more than a collection (a loop of questions that lets a TP add multiples of one type of item, like multiple W-2s).

![SUBSECTION_B](https://github.com/user-attachments/assets/9ec196c1-8cf3-4881-ada9-32bb58c0e4c6)

C. Inner Collection Subsection (aka Question-Collection Subsection)

Use this structure for subsections that combine a flow of questions with a subcollection (like the Child and Dependent Care Credit, which both asks a sequence of questions and multiple care providers' info). Note that this hierarchy has three levels of review UI, with a top-level data view for the subsection, a collection below that, and then each item's data view below the collection hub.

![SUBSECTION_C](https://github.com/user-attachments/assets/4b5de5dd-8111-4d22-b648-c20b726fe102)

D. Assertion Subsection

Use this structure for subsections that are composed of nothing more than an Assertion or for which the Assertion page can provide access to any subpages (for example the Filing Status subsection or the Credits summary subsection).

![SUBSECTION_D](https://github.com/user-attachments/assets/2b2c8262-1152-4398-931a-203e43bd7740)

E. Review Subsection

This is a utility subsection in that it contains no substantive content (no assertions, math, or fill in).

![SUBSECTION_E](https://github.com/user-attachments/assets/32eb947f-dd1e-4f89-8847-80348b4b6ad8)

### **3\) Sub-subsection**

Sub-subsections are the third category level. They provide smaller groupings of questions within a subsection, making it easier to revisit/edit a specific question. There can be many sub-subsections within a subsection.

Sub-sections are only displayed on Data views, which show a summary of answers to a subsection or collection item. If a taxpayer spots an error or wants to reread a question, they're able to edit that specific sub-subsection.

![Sub-Subsection](https://github.com/user-attachments/assets/cc2338bb-3946-4d88-bd9a-e254fe341e41)

### **Terms only used internally**

Note that these are terms we're only using internally. Taxpayers don't need this level of detail. Publicly, we're using section to generally refer to any part of Direct File. (Ex: Review information in this section before you continue might actually be referring to a sub-subsection.)

## **Data View**

Direct File has a number of navigational screens, to help the taxpayer navigate through the various sections.

Data views are navigational screens that show a summary of answers to a subsection or collection item. They allow taxpayers to review and/or edit their completed answers.

![Navigation_-_Data_view](https://github.com/user-attachments/assets/7cee0501-fd49-42d9-b21b-888f6fb2e9a4)

### **Interaction and behavior**

Data views are a navigational screen type that summarize the answers for a particular subsection or collection item and provide access for editing. They give the user a 1-page launch point for reviewing and editing their responses. On data views, to keep the editing experience efficient, information is presented in groupings ("subsubsections" or "edit chunks") which are sets of questions or inputs that are thematically associated, like sets of conditional questions or input fields on a form fill-in page.

NOTE: for Assertion subsections, the Assertion screen is the data view because there are no other inputs for which we need to provide edit access.

* Answers on Data views are presented as key-value pairs. There are the content guidelines for how questions and answers should be written in data views.

![Question_Data_view](https://github.com/user-attachments/assets/7bb3339b-0dc5-415b-b857-22b65a6faf87)

* Data views only display sub-subsections the taxpayer has already visited. As a result, taxpayers will not see questions they haven't gotten to yet, or conditional questions that aren't relevant to them.

* Assertion sections without any questions (Filing status, Amount, and sometimes Credits) don't have Data views. The Assertion page itself is the data view and is accessible directly from the checklist.

Behavior

* As each question is answered through a flow the information is gathered in the data view which is presented at the end of the section.

* The data views have edit links for sub-subsections, which makes it easier to jump into a specific part of a subsection and make a change.

* Once the information has been viewed in data view the taxpayer will use the continue primary button to return to the checklist page and start the next section.

* If a taxpayer wants to review a previous subsection they can select a subsection heading link to navigate to the data view. Once they are done reviewing the data view they will see a secondary button at the bottom of the page. The button will read "continue" if the user is encountering this view while progressing forward in the flow or will read "go to tax return page" if the user has already progressed past the subsection in their work and is now revisiting it.

* Review and confirm is a type of Data View

Data view DF example

<img width="656" alt="DataView_2" src="https://github.com/user-attachments/assets/abcca5c3-bd75-4b34-b90f-0a0339ce31f9" />

Data View Error Hierarchy

* Flattish presentation of alerts: Issue types can start to be categorized into errors and warnings on the data view at the top with individual item cues having a chance to provide more detail adjacent to the item(s) in question.

* On Data Views and Collection Hubs, the error system uses alerts with jump links that send the user to the section or collection hub item where the error is. For Family & Household, many of the section names and collection hub items contain personally identifying information (PII). To avoid revealing any PII in the links, be sure to remove PII from these jump links.

  * For example, if a section name includes a first name e.g.: "Firstname's relationship to you", then any error or alert jump links pointing to that section should remove the PII of "Firstname" and should be shown as: "relationship to you"

<img width="223" alt="DataViewErrorsBasic" src="https://github.com/user-attachments/assets/39010e16-7104-49bc-af07-e2e88f1da1f8" />

# **Pages types: Navigational**

Common page types found in Direct File.

Navigational pages: Dashboard, Checklist, Collection hub, Data view, Review and confirm, Account, and Data import.

## **Dashboard**

Direct File has a number of navigational screens, to help the taxpayer navigate through the various sections.

The Dashboard is the first screen the taxpayer will land on, and it has the highest-level view: tax returns.

![Navigation_-_Dashboard](https://github.com/user-attachments/assets/9da82f5e-8b6a-4191-889a-0a0951878e4c)

### **About the Dashboard**

The Dashboard shows available tax returns as cards. Those who live in relevant states will also see a card prompting them to fill out their state tax return (on an external site).

In future years, taxpayers might be able to view (or even interact with) previous years' tax returns.

### **Interaction and behavior**

When a taxpayer signs on to Direct File they will immediately see their dashboard that reads "Welcome to Direct File", provides their email address, and a tax return card. The tax return card is the main component on the dashboard and provides taxpayers with status updates, alerts, tax return ID, summary links, alerts, and next steps. It is also the final card a taxpayer sees once they have submitted tax information through Direct File.

#### **Added additional page**

Intro Page ( Based on user feedback, we're seeing a need to emphasize some info at the beginning of the DF flow. So TPs start off prepared and with full knowledge about the screener (which many TPs seem to be skipping).

* With this in mind, we've made 2 changes:

  * Add a new screen before the screener just on 1st visit

  * Add a bite to the Checklist, so TPs can revisit this new screen

## **Collection hub**

Direct File has a number of navigational screens, to help the taxpayer navigate through the various sections.

Some subsections can house a collection of items, such as multiple \[potential\] dependents, Forms W-2, etc. The Collection hub serves as a navigational screen for these subsections.

![Navigation_-_Collection_hub](https://github.com/user-attachments/assets/4930ddba-b474-4ffd-b72d-ccbec6307cd2)

### **About**

Some subsections have a series of questions that only need to be answered once. When this happens, the first screen in the flow will be introductory content or a question.

Other subsections start with a Collection hub, which allows a taxpayer to report multiple of something. They're able to loop through a series of questions multiple times, or skip them entirely if they're not relevant for them.

![CollectionHub_1](https://github.com/user-attachments/assets/942c76d3-efb9-4744-aa21-b8920f1c690c)

![CollectionHub_2](https://github.com/user-attachments/assets/246e0c5b-fd07-4e53-8261-0597e4a44857)

These are examples of collection hubs:

* Family and household

* Jobs

* Interest income

* Unemployment compensation

* Social Security benefits

### **Interaction and behavior**

As taxpayers add collections to their tax return, they will populate individual cards on the collection hubs.

The collection cards shows a summary of the information. To view all answers for a collection, the taxpayer can select Review and be taken to the collection Data view.

## **Review and confirm**

Review and confirm is one of the last subsections in the Checklist, and provides an opportunity to review your answers before signing and submitting.

![Navigation_-_Review](https://github.com/user-attachments/assets/06fcfaa0-cba4-48de-873e-e6d072b929fb)

### **About**

The first subsection in the "Complete" section is "Review and confirm." The taxpayer can use it to check that the tax information they completed in Direct File up to that point is accurate. They can then move on to sign and submit their federal tax return.

### **Interaction and behavior**

Review and confirm has a similar visual style to Data views. It provides "Review" links to all the Data views and Collection hubs.

Review and confirm errors

Review and confirm is a section off the Checklist. Its MVP form repeats the checklist and creates value to the user by slowing their task and calling their attention to all remaining errors and warnings before letting them move ahead to signing and submitting. Once all showstoppers are resolved, the TP can confirm and move forward.

Everything that comes before the Review and confirm section is the meat of the tax return. Anything that comes after is related to getting the tax return to the IRS one way or another.

Once all errors have been cleared, a primary button will appear at bottom of page for taxpayers to confirm they have reviewed their tax return.

![Review_Confirm_Errors](https://github.com/user-attachments/assets/35430f64-42f9-4d69-a5dc-5fcefe649822)

## **Account**

### **About**

Account page under the basic header and side menu which helps users identify where they are and provides a quick, organized way to reach the main actions of a website. We are using a limited header because of our shallow hierarchy for now but this could grow over time.

### **Interaction and behavior**

**Information found under account:**

* How to change your email in ID.me
* How to reset your draft and delete submitted returns from your account
* Sign out

<img width="882" alt="Account_wiki_2" src="https://github.com/user-attachments/assets/a3991248-5a9c-4cf2-9b43-bedc27562c50" />

# **Page Types: Flow screens**

Introduction screen, Question screen, Assertion screen, Knockout screen, Math breakdown screen, Tax return card

## **Introduction screens**

All sections in Direct File must start with a section introduction that lets taxpayers know what to expect in the larger section.

In addition, subsections in Direct File can start with an introduction screen that lets taxpayers know what to expect in the following screens.

### **About Section-level introductions**

Section-level introductions details

* Can be 1 page or several

* Must be evergreen content to serve users working forward through the flow or revisiting the page after having progressed past it

* When a user continues past the section level intro, it will flow into the section's first subsection, but if the user is revisiting the section introduction after having progressed past it, it links back to the checklist; see the checklist pattern

### **About Subsection Introduction screens**

Intro screens often have the following:

* Context header

* H1 that starts with "In this section..."

* Brief body copy explaining the types of questions in this subsection

* A list of any documents or information they'll need to have on hand

The amount of content on these screens varies. We haven't been strict about the exact info needed, and instead have allowed customization based on the subsections needs.

### **Visual Design References**

![Intro_1](https://github.com/user-attachments/assets/a967d5cc-fa61-4bb0-9c34-509b4c067096)

![Intro_2](https://github.com/user-attachments/assets/a18dc83b-c740-489d-842b-2e0e1a80b186)

If there's a lot of information, the intro info could be broken into 2 screens, like for Family and household:

![Intro_3](https://github.com/user-attachments/assets/caa8bca1-c679-4873-8c2f-04b99aed3fd7)

![Intro_4](https://github.com/user-attachments/assets/66780735-8a4d-458c-b63b-492dc1fed7d2)

### **Interaction and behavior**

Navigation considerations:

* Currently, intro screens can't be revisited from data views. So any important information that needs to be revisited shouldn't only live on intro screens.

* DF currently has several collection hubs:

  * In You and your family: Family and household

  * In Income: Jobs, Interest income, Unemployment compensation, Social Security benefits

* They handle the intro screen differently. Family and household has 2 intro screens before you get to the collection hub, while the 4 income type subsections have the intro content on the collection hub screen. (And we're putting in a last-minute change in April for this intro content to go away once a collection item has been added.) This different setup wasn't necessarily intentional, and might be reconsidered for future years.

Let's continue to evaluate these behaviors as DF scales and grows. For example:

* Are we using the intro screen consistently throughout?

* Does any important info exist only on an intro screen that needs to live elsewhere?

* Are there places where it makes sense for the intro screen to be handled differently?

## **Question screen**

The majority of screens in Direct File are question screens. They ask the taxpayer 1 question (or sometimes provide 1 instruction), and provide form fields for answering.

### **About the Question screen**

Question screens have just 1 question or instruction, and then form field(s) to answer. Common form fields are: Radio buttons, Selects, Text inputs.

In the Direct File pilot, the majority of question screens have just 1 form field, to keep each screen simple and focused. Some screens have multiple related form fields, like for contact information.

Many of the questions are required.

### **Design references**

<img width="665" alt="Questions_1" src="https://github.com/user-attachments/assets/0bc5603e-4844-489f-a63e-9037b3475470" />

<img width="591" alt="Questions_2" src="https://github.com/user-attachments/assets/e469b5c6-c8c6-481f-bb1e-c38998e81caa" />

![Questions_3](https://github.com/user-attachments/assets/91b0f15e-9f7e-4509-baa4-2473b4993070)


### **Interaction and behavior**

Each question screen has a Save and continue button at the bottom, which saves a taxpayer's answer(s) for that screen. These answers can be reviewed and revisited from the data view.

## **Assertion screen**

Assertions are screens where Direct File tells the taxpayer something important, based on the information they've provided.

### **About the Assertion screen**

Direct File learns more about a taxpayer as they answer questions. At certain spots in the tool, Direct File knows enough to declare something about their tax situation. We call these screens Assertions.

Assertion screens have the following:

* Info\_outline Icon

* H1 with the most important assertion information

* Body copy with additional information

* Action:

  * Sometimes the only action is Continue

  * Sometimes taxpayers get an option, but get an alert telling them which option is more advantageous

  * Sometimes taxpayers can choose an alternate option

### **Design reference**

For some assertions, there's nothing for the taxpayer to decide.

![AssertionReference_1](https://github.com/user-attachments/assets/8bcf1cd7-e407-4d23-9582-1b03bdae704c)

![AssertionReference_2](https://github.com/user-attachments/assets/06086db3-05e6-49d1-81f8-ed5899ab6ee3)

For others, the taxpayer can make a choice (or pick an alternative), but the assertion screen clearly states which option is most advantageous for their tax situation.

![AssertionReference_3](https://github.com/user-attachments/assets/3039c8a3-299c-4632-bd3d-562f2b6f448d)

### **Interaction and behavior**

These subsections are considered Assertion sections:

* Filing status

* Credits (sometimes, depending on tax situation)

* Amount

These subsections are just made up of Assertions, and don't get a data view.

## **Knockout screen**

A knockout screen lets a taxpayer know their tax situation is out-of-scope for Direct File, and redirects them to other filing options.

### **About Knockout screens**

Knockouts are 1 of 2 ways Direct File lets taxpayers know their tax situation is out of scope. (The other way is scope flags.)

There are 2 types of situations that can trigger a knockout:

1. Given what the user told us, we cannot legally allow them to proceed, because it would be against IRS rules to do so.

   * Example: You told us you have allocated tips, but we don't support reporting of allocated tips. You can't proceed because you have to report all taxable income.

2. Given what the user told us, we could technically permit them to proceed and still abide by IRS rules, but they would be missing out on important tax benefits. We will not allow users to proceed in these situations, because it will have an adverse impact on their tax outcome.

   * Example: You qualify for EITC, but since your credit has been disallowed in the past and your qualifying child is the qualifying child of more than one taxpayer, you have to complete Part V of Form 8862\. We don't support Part V, so even though you qualify for EITC, we can't file your taxes with EITC.

If we know (based on their answers) that Direct File doesn't support a user's tax situation, we send them to a knockout screen. This screen typically has the following:

* error\_outline icon

* statement that, based on their answers, they're not eligible to use Direct File this year

* explanation of why they're not eligible

* link to learn about other filing options

* button to exit tax return

<img width="750" alt="Knockout_Example" src="https://github.com/user-attachments/assets/5631c142-a701-4aff-9d1f-67a9fcd40931" />

### **Interaction and behavior**

Once a taxpayer is knocked out, they can still revisit the Checklist, but much of the functionality is locked down. They can still access the question(s) that caused the knockout and make changes. If they change the knockout answer, the knockout lockdown can be lifted, allowing them to continue with their return.

When a knockout is triggered, the following happens:

* The taxpayer is redirected to a knockout screen that explains why they're not eligible to use Direct File. It also suggests other filing options.

* A site banner appears at the top of every screen inside the return (except the knockout screen) alerting the taxpayer to the knockout.

* The taxpayer can revisit the Checklist, but some of the functionality is locked down. (Most notably, filing.)

   Note that this locked-down functionality is still being built out, and will continue to get more robust.

## **Math breakdown screen**

A screen that shows how Direct File calculated specific tax amount(s), like taxable income or final tax amount.

### **About the Math breakdown screen**

One of the guiding principles for Direct File is: Help taxpayers understand complex tax concepts (if they want to).

Math breakdown screens directly contribute to this goal by helping taxpayers understand the math behind their return. Interaction and behavior

We have 3 math breakdown screens:

* At the end of Deductions, we break down how taxable income was calculated.

* At the end of Credits (when relevant), we break down Nonrefundable credits and Refundable credits.

* At the end of Amount, we break down how the final tax amount was calculated.

![Math_breakdown_1](https://github.com/user-attachments/assets/27c5b97b-b134-401e-9c7b-07a6723342df)

![Math_breakdown_2](https://github.com/user-attachments/assets/45179cb4-1d87-4460-875b-77a09095479a)

![Math_breakdown_3](https://github.com/user-attachments/assets/b866a320-4ef8-45b6-8b3c-ae6f174e822c)

Hyperlinks in the math breakdown screens are snacks that open modals explaining these tax concepts. These are often repeated from other sections of DF.

![Math_breakdown_4](https://github.com/user-attachments/assets/b2e26bd1-7659-4c60-b07f-ee0ae345b464)

## **Tax return card**

The tax return card communicates a taxpayer's progress in the flow as well as post-submission status updates.

### **About**

The tax return card is the main component on the dashboard and provides taxpayers with status updates, alerts, tax return ID, summary links, alerts, and next steps. It is also the final card a taxpayer sees once they have submitted tax information through Direct File.

### **Interaction and behavior**

#### **Visual Overview**

<img width="1466" alt="TaxReturnCard_RefinementAnnotations" src="https://github.com/user-attachments/assets/6eb62fde-9f94-44d9-af59-e42e7662d1d1" />

### **Start and in-progress**

The Direct File dashboard contains a federal tax return card, which invites taxpayers to start their return or continue a tax return that's already in progress. From here they are directed to the checklist to start or return and continue where they left off.

<img width="723" alt="Start_Inprogress" src="https://github.com/user-attachments/assets/2a352b98-2591-4cda-a20b-97f7633bb141" />

#### Status

Post-submission tax return statuses are: Submitted, Accepted, Rejected, and resubmitted after rejection. Status alerts are always in bold.

#### **Submitted**

Submitted returns will see a tax return card with a blue submitted status alert and offers a link to Tax return details page, submitted downloadable PDF, and next steps with details on payment/refund methods. Taxpayers that must file state taxes will see guidance on filing state taxes.

The tax return details page list the tax return ID, submission date, acceptance date and all selections, deduction and credits. From this screen, taxpayers may also download their submitted 1040 merged PDF from this page.

After they submit their tax return, taxpayers who live in Arizona, California, Massachusetts, New York, or Washington will see additional information about filing their state taxes.

#### **Accepted**

Accepted returns will see a tax return card with a green accepted status alert and offers a link to Tax return details page, submitted downloadable PDF, and next steps with details on payment/refund methods.

In addition to seeing their federal tax return status on their Direct File dashboard, taxpayers will also receive notification emails for each of the three statuses (submitted, accepted, rejected). These emails will not contain any sensitive taxpayer information and will direct taxpayers to log into Direct File to see their dashboard for more information on their federal tax return.

#### **Rejected & Resubmitted and Knockout after rejection**

When a tax return is rejected, the dashboard will display a red rejection error message and guidance for how the taxpayer can review their errors, then edit and resubmit their tax return using Direct File.

There are some tax situations that require Forms not supported by Direct File in this current phase. In these situations, taxpayers will be unable to fix the errors in their federal tax return and resubmit in Direct File (knockout). They will be guided to find another way to file their federal taxes.

<img width="445" alt="RejectedTaxReturnCard" src="https://github.com/user-attachments/assets/861c938a-4f5b-4b32-ba39-15f3275223d0" />

<img width="477" alt="RejectedandKO_TaxReturnCard" src="https://github.com/user-attachments/assets/80b76ea4-fb82-4126-a25f-229dc48e34a0" />

#### **Paper filing path**

We are only supporting an 'in progress' tax return card for the paper filing path for MVP.  Refer to the Direct File Design Guidelines & Processes for more on paper filing path.

<img width="260" alt="InprogressPaperFiling" src="https://github.com/user-attachments/assets/856aaef3-d52a-4e27-af14-934ed2dd27c7" />

#### **Error/Alert states and Knockouts**

* Messaging System

<img width="193" alt="TaxRetrunCard_GeneralErrors" src="https://github.com/user-attachments/assets/421184a9-55a8-4850-b55f-d9534e44f52f" />


# **Communicating scope**

We use 2 main patterns inside the tool to communicate what's not currently supported:

## **Scope flags**

When we don't specifically ask users about a situation, but instead generally inform them about what's not supported.

### **About Scope flags**

It's not realistic to ask taxpayers about every tax situation we don't support. That's where scope flags come in. Instead of asking a question directly, Direct File provides some information about out-of-scope scenarios. Taxpayers can review this information and choose to opt out of Direct File, if relevant for them.

### **Interaction and behavior**

In the Direct File pilot, there's not 1 set pattern for displaying scope flags. There's currently 3 flavors:

* Appear inside snacks, for less common scenarios—Seen in You and your family and Deductions. These snack modals aren't focused on scope, but mention an out-of-scope scenario at some point. Often the snack topics are sensitive or rare (ish), and go into extra detail that most TPs won't need.
![Scope_flag_modal](https://github.com/user-attachments/assets/be0748a7-e4ea-4568-b56e-0f074fdd1e59)


* Appear on the screen in body copy, for more common scenarios—Seen in Credits. These include a mention that some things are out-of-scope on the screen, usually with a snack link for more info. They're displayed as body copy, and are flagging scenarios that could save you money but won't get you in trouble if you get them wrong.
![Scope_flag_body](https://github.com/user-attachments/assets/9d81665c-8edf-4c20-b183-48a7a9b8587c)


* Appear on the screen in Alerts, for common and serious scenarios—Seen in Income. These include a mention that some things are out-of-scope on the screen, usually with a snack link for more info. They're displayed in Alerts, and are flagging scenarios that could get you in trouble if you get them wrong.

![Scope_flag_alert](https://github.com/user-attachments/assets/0a8c71de-c6c8-45df-aae5-5bbbde5dec41)

![Scope_flag_alert_2](https://github.com/user-attachments/assets/1b50e378-d692-46f1-acd8-51596c890057)


# **Message system**

We have 3 different types of messages:

* System messages

* Errors, warnings, and status messages

* Info boxes, prompts, and reminders

These distinctions are useful internally, because their functionality differs. But for a user, these are all basically the same thing: it's DF telling them something important (to varying degrees). So it's important for each item and set of items to speak with a consistent voice, reference other elements in the system with consistent phrasing, be visually/tonally recognizable as a DF communication, and generally operate as a cohesive set.

## **Errors, Warnings, and Status Messages**

These are [USWDS alert](https://designsystem.digital.gov/components/alert/) guidelines, including how they may chain from the page level up to the return card level.

### **About Errors, Warnings, and Status Messages**

Tax return alert

A tax return alert is our mechanism for reporting in an assertive way on a problem or situation that calls for timely attention or intervention by the user and pertains to their return's content. The issue's level of consequence can range from moderate to high, but the information presented in an alert is generally reporting on a consequence impactful enough to (1) halt, (2) alter, or (3) endanger the user's ability to reach their end goal: successful filing.

Because of the level of consequence, these messages by definition must be assertive and therefore require a chain of cues (signposts) from UI-to-UI that highlight the issue and lead the user directly to the location in DF where they can review or resolve the condition that prompted the alert.

This definition differentiates the tax return alert from all other info box elements DF may use to explain, nudge, or provide other important information to the user even if the element uses warning or error styling, or status indicators that chain from UI-to-UI (like dependent/qp outcome flags). While those elements may be presented in reds and yellows, they don't meet the definition of tax return alerts.

Here's a visual for how those chain:

<img width="614" alt="Tax_return_alert_chain" src="https://github.com/user-attachments/assets/888a415f-8e8b-4a80-a056-9bd2e444e2ba" />

#### **Tax return alert: Error alerts**

Error alerts are for things that can be resolved through action in DF in the course of the user completing things necessary to their DF return prep task. What makes an alert an error and not a warning is that DF itself can validate changes to resolve the problem that prompted the alert. DF can know if user action (or its own action, in cases of autocorrect) resolved the problem.

Errors are a forcing function: their behavior compels the user to resolve the condition that prompted the alert before they're permitted to move forward with working on or submitting the return.

#### **Special error type: Incompletes**

As DF works today, we force users to fill out all required fields on a page before saving it. Therefore, we don't expect there to be pages that have a mix of complete and incomplete fields.

Incomplete questions and collection items should be understood to be errors because they serve a forcing function: the user will be stopped from submitting their return while there are any missing pieces of required information. As errors, they are resolvable entirely in DF: it's a question of completion, which DF can validate.

Incompletes get a special behavior based on the relative consequence of leaving them incomplete up to a point in the prep task and because we aim to provide a flexible prep experience. We may choose to delay the point at which we force a user to complete missing information based on the type. For example, we might only actively force users to resolve all incompletions at certain points of progress like (1) before unlocking a next section (2) before progressing past the review and confirm screen or (3) before we permit them to submit their tax return to MeF.

These are true errors, we're just delaying when we enforce them. For errors that get delayed enforcement, permit the alerts to be styled and treated as warnings until the point of enforcement, then switch to traditional error styling and treatment. So, if there is an incomplete set of questions in spouse MFS that we only enforce completion of once the TP unlocks the Review and Confirm screen, we treat and style the incompletion alerts as yellow warnings until the TP visits the Review and Confirm screen, on load of which they all switch to treatment as the errors they are \-- and they get red style. While being treated as warnings, they get aggregated in lists with other warnings. Once their time has come to be enforced, they get treated as errors and aggregated in lists with other errors.

Special error type: Knockouts

Knockouts (KOs) are errors that force the user out of the tax return prep task because their tax situation is out of DF scope. The KO condition has associated DF behaviors including but not limited to

* User should be permitted to edit the answers that led to the KO in case of error

* User can't edit return information past the point where the KO was caused

* User can't submit the return

* State of the return as KOd gets chained cues up the structure to the top level

* May OBE other errors or warnings

#### **Tax return alert: Warning alerts**

What distinguishes a tax return warning alert from an error alert is that (1) if it is reporting on a problem of incorrectness, it's one that DF cannot validate and resolve, and (2) not all things we need to report on assertively are problems of incorrectness, they may be only possible problems or something else the user needs awareness of like a limitation placed on method of filing.

Because such warning alerts might not be resolvable in DF, they might not be something the user can make go away through their own action unless the state of the return changes to make all such alerting OBE, such as 'submitted/accepted.'

Warnings don't force the user to resolve them, but they may give the user the opportunity to resolve them by changing answers or manually dismissing the alert. If the warning is at the page level, the user can save and continue or just leave the page by navigating away and they can still continue. If it's on the return level, they can still e-file or proceed on the paper path.

When warnings are used to report on a problem with the correctness of a tax return, it's in the situation where DF can't know if action the user takes in DF actually resolved the problem. This can only be known by submitting the return back to MeF. Or it may be entirely unresolvable in software and require real world action.

Like error alerts, warning alerts are shown in response to a problem or a condition that the user needs to be aware of and warning alerts cover different levels of consequence: an unresolved warning can have no effect on the user's ability to complete their task or it can result in MeF rejection.

#### **System alert**

System alerts are critical messages DF displays to report on the state of the system or its success or failure executing a task.

### **Interaction and behavior:**

The following are how to chain these alerts from page to page, otherwise known as "Cues and aggregator rules":

### **Page level**

Flattest presentation of alerts: Issue types should be presented in the flattest and most detailed way when the user is on the page view because this is where that detail is most immediately relevant to action: review or editing.

<img width="693" alt="page_level" src="https://github.com/user-attachments/assets/12444f6c-c00f-4272-b617-fdacd7662775" />

#### **Rules and order**

1. All alerts should come before the question text on the page.

2. All errors come before any warnings.

3. Don't combine multiples into one block. Exception: field validation error type gets its own block, and if there are multiples, they all go in the one summary block

#### **Order of display**

1. Connectivity banner

2. System error(s)

3. MeF rejection return alert error(s)

4. Tax return alert error(s). These are any error that are neither MeF errors or field validation errors (e.g. your date of withdrawal has now passed, or forced-change error message for invalid filing status).

5. Summary of field validation errors (problem with format, required field blank, etc.): combine multiples in one alert block.

6. MeF rejection return alert warning(s): don't combine, stack.

7. Tax return alert warning(s). These are any other warning the page is kicking off, e.g. 'you're on the paper path because you said you don't have your IP ready to enter.'

Note: we don't show "resume" prompts on the page level, just dump you on the page to keep working.

#### **Reasoning**

System errors above all else: System errors are not caused by the user but it's critical the user have immediate awareness of problems DF is experiencing. It's the highest-priority type of error.

Don't hide other errors or messages if there's a system error: System errors should be shown above all else because they can prevent the user from taking any other action, including resolving other errors that might be reported on the page.  Note that most of the time if there is a system error, it will be a whole-page error and the rest might not render at all. For any cases where such an error shows on a page with other content, it gets a top slot in the structure. We'd want to avoid flashing the other errors on and off in response to anything other than true resolution, so if there is a system error and other alerts, just show them all together stacked up.

Errors are the next highest priority type of error: These are alerts for issues that DF can resolve and can know the TP resolved. They are showstoppers like validation errors. DF won't permit saving or resubmission while the error persists. Show field validation errors on their own from other error messages because they can be resolved on change whereas other errors are resolved on save. This difference in how they are resolved makes the argument for their getting their own block. The shape of the content is also different enough from field validation errors to other kinds of errors that it's not worth trying to jam them in one box. Let them sit next to each other on the page.

The remaining space can be used by warnings: Unlike errors, these alert types aren't something DF can know is resolved. Some may not go away until successful submission, others may stick around due to an option exercised by the user (like a choice to proceed on the paper path). Because warning resolution interactions aren't the same (even from warning to warning), they should not be combined into a summary together. Each message block should stand alone. Within warnings, MeF rejection warnings are the highest priority and should come before other kinds of warnings. I don't yet see a priority order among other warning types.

### **Assertion sections/Assertion-as-data-views**

Flattest presentation of alerts: Issue types should be presented in the flattest and most detailed way when the user is on the assertion or assertion-as-data-view page view because this is where that detail is most immediately relevant to action: review or editing.

<img width="299" alt="Assertion_section_alert" src="https://github.com/user-attachments/assets/1ef98545-35f0-4b4f-9322-385c97ded294" />

When there is a Filing Status error (this is caused by changes outside the filing status section), the page the user sees is not the section's assertion data view anymore, it's a forced correction screen.

Assertion pages like the Amount page especially need a spot for messages because there can be warnings that direct the user to go finish items in other sections (like incomplete income items).

The Credits section has a conditional variation that uses an assertion as its data view instead of its usual data view.  Its assertion variant may not generate errors of its own but still needs slots to display warnings.

#### **Assertion sections**

Assertion sections don't generally have input pages that will generate field validation errors, but they can generate errors or warnings of their own (like "you need to update your filing status" or someday they may give warnings like "I've changed since you last looked, review me.")

Like any DF page, they need to be able to display errors and warnings.

#### **Do these pages need every warning slot?**

I don't yet foresee any of the current assertion sections getting MeF errors or MeF warnings, but I also don't think it hurts anything for them to use the same slot pattern that all other pages do \-- and just not use them if they're not needed.

#### **What kinds of alerts will they have?**

The errors and warnings they do display will tend to be explanations about something the TP changed elsewhere in the return that caused or necessitated a change here.

Warnings might include awareness messages like "you have items in progress that may affect this amount. Go finish them."

We should reserve space on ALL assertion pages for displaying all such alerts, just like any other page in the application, whether we currently think they're needed or not.

#### **Data view level**

Flattish presentation of alerts: Issue types can start to be categorized into errors and warnings on the data view at the top with individual item cues having a chance to provide more detail adjacent to the item(s) in question.

<img width="223" alt="data_view_level" src="https://github.com/user-attachments/assets/59d3cf5c-4caa-44cf-9b01-e398bc919ac4" />

#### **For any amount of errors and/or warnings on data views**

Always use one summary box for each type: 1 errors summary, 1 warnings summary. Those summary boxes have links to jump down the page to the affected question. Note: a SSS can list a page that has several fields shown or several pages with one or multiple fields shown. It just depends on the SSS. This is more about showing logical groupings flat for review than anything else:

<img width="1349" alt="Summary_alert" src="https://github.com/user-attachments/assets/05b5b296-d524-423c-ab5a-22e551a10310" />

#### **If there is 1 error or 1 warning for a given page**

Show the alert indicator below the field name it goes with, using any specific message text, (else a general message if we can come up with one). If the set of alerts contains at least 1 error, style the cue in red error style. If the set of alerts contains only warnings, style the cue yellow warning style. Links go directly to the page with the errors/warnings:

<img width="864" alt="alert_indicator" src="https://github.com/user-attachments/assets/1bb53c1e-b9e1-40e8-9d4a-62a96e8cf692" />

#### **If a page is incomplete**

It won't have errors or warnings on it, so we could show a "resume" prompt immediately below (still designing how this works). Red or yellow depends on enforcement:

<img width="381" alt="incomplete_warning" src="https://github.com/user-attachments/assets/ba8810be-38db-4366-8d34-c6410750e3d1" />

### **Collection hub level**

Aggregated (with exceptions): Issue types can be grouped together with the exception of MeF warnings that pertain to a whole set of things instead of with precision.

Collection hubs are a list view. They're the next level up from data views for collection sections, like Family and household. For sections that aren't collections, like About you, the next level up from a data view is the checklist.

<img width="221" alt="Collection_hub_level_alert" src="https://github.com/user-attachments/assets/85cd08e8-938c-465e-b92f-d1f890fdef66" />

#### **For any amount of errors and/or warnings on collection items**

Always use a single summary box to jump down the page to the affected cards. This can include MeF errors and MeF warnings generally with the following exception: there are some MeF warnings that are really more about a broad set than pinpointed in an item. See the MeF warning immediately below for more.

<img width="221" alt="Collection_hub_level_alert" src="https://github.com/user-attachments/assets/129a0be4-d175-449b-b3ca-087db1d346a0" />

For any amount of errors and/or warnings in a given collection item, always use a single cue on the card itself to direct the user to drill into it for more. 1 signpost.

#### **If there is 1 error or 1 warning in a given collection item**

Show the alert indicator using any brief specific message text (if we have it) else use a general message and use the error or warning style accordingly.

<img width="1610" alt="MeF warning" src="https://github.com/user-attachments/assets/8b95bdc9-9517-4288-a43a-4d16d279d162" />

#### **If there are multiples (errors, warnings, or both) in a given collection item**

If the set of alerts contains at least 1 error, style the cue in red error style. If the set of alerts contains only warnings, style the cue yellow warning style

<img width="1650" alt="error_and_warning" src="https://github.com/user-attachments/assets/0fca6db4-f860-4545-83fe-b4537b412b85" />

It's always a "review" link, because that's the action that takes you to the next UI in the chain: the collection item's data view

### **Checklist**

Aggregated (exceptions?): Issue types can be grouped together with the exception of anything known or yet to be determined that merits standing alone on the page.

<img width="264" alt="aggregated_checklist_warnings" src="https://github.com/user-attachments/assets/2e8ed576-1423-4cfc-9930-b8b57d872e2d" />

The checklist is the main navigation UI for the return prep task. It is the next level up from collection hubs and from data views for those sections that aren't collections.

The return status banner is reserved for return-level flags that should be presented on their own like:

* Your filing method is limited to the paper path

* Knockout state

* Submitted (pending) / Accepted

* Rejected

The aggregate summary banner follows these rules:

<img width="1325" alt="aggregated_summary_banner" src="https://github.com/user-attachments/assets/7d22f0ea-3be9-44bf-9592-3cba9f4d0fd4" />

### **Cue slots**

Every section gets an alert cue slot except for the final submission section (e-file/directions to mail). For any amount of errors and/or warnings in a section, always use a single cue immediately below the section block itself to direct the user to drill into it for more. 1 signpost. No link needed.

<img width="632" alt="cue_slots" src="https://github.com/user-attachments/assets/64b24234-6723-4a09-9ed0-d4f0dd0de046" />

#### **If there is 1 error or 1 warning in a given section**

Show the alert indicator using general message and use the error or warning style as accordingly:

<img width="808" alt="cue_slots_one_error_warning" src="https://github.com/user-attachments/assets/b8a9ddf9-faa8-4c50-8435-699ad04228c2" />

If the single item is an incompletion, then show that prompt specifically (red or yellow depends on enforcement):

<img width="332" alt="cue_slot_single" src="https://github.com/user-attachments/assets/133d6e4e-f16d-4c18-a814-f8c59fdd36eb" />

#### **If there are multiples (errors, warnings, or both) in the section**

If the set of alerts contains at least 1 error, style the cue in red error style. If the set of alerts contains only warnings, style the cue yellow warning style. And if the only thing in the section is only incompletions, show that final style (red or yellow depends on enforcement)

<img width="1146" alt="cue_slots_multiple" src="https://github.com/user-attachments/assets/9cb897c0-6da1-4389-ae67-2945dbf4a7d0" />

### **Review and confirm**

Aggregated (exceptions?): Issue types can be grouped together with the exception of anything known or yet to be determined that merits standing alone on the page.

<img width="226" alt="review_confirm_aggregated" src="https://github.com/user-attachments/assets/ef4d921e-b4bc-498e-ab2c-6578eab7d875" />

Review and confirm is a section off the Checklist. Its MVP form repeats the checklist and creates value to the user by slowing their task and calling their attention to all remaining errors and warnings before letting them move ahead to signing and submitting. Once all showstoppers are resolved, the TP can confirm and move forward. Everything that comes before the Review and confirm section is the meat of the tax return. Anything that comes after is related to getting the tax return to the IRS one way or another.

<img width="1622" alt="review_confirm_checklist" src="https://github.com/user-attachments/assets/74a552fa-6398-48eb-80df-f60ee64f3849" />

Every section gets an alert cue slot immediately below the section title. For any amount of errors and/or warnings in a section, always use a single cue immediately below the section block itself to direct the user to drill into it for more. 1 signpost. No link needed.

<img width="1264" alt="review_confirm_rules" src="https://github.com/user-attachments/assets/d565caae-05f6-4668-88e5-ecafd061a58c" />

If there are any unresolved errors (it doesn't matter if there are warnings), make the button invisible and show an info box. On this page only. Show a conditional info box that explains why the "continue" button is not present when there are errors on preceding sections. This is just an info box, not an alert.

<img width="413" alt="unresolved_errors" src="https://github.com/user-attachments/assets/25d72f7c-a560-4ef9-abf4-2785cd9692f1" />

If no errors (it doesn't matter if there are warnings), no info box needed and make the button visible

<img width="438" alt="no_errors" src="https://github.com/user-attachments/assets/0b4859a4-ba7c-486d-909a-1ca8449f8e79" />

### **Return card**

Aggregated (are there exceptions?): Issue types can be grouped together with the exception of anything known or yet to be determined that merits standing alone on the page.

<img width="335" alt="return_card_aggregated" src="https://github.com/user-attachments/assets/07a36551-da42-4481-bf6e-4c317dc7d7f2" />

#### **"State taxes" warning**

This is a special use case and only appears for taxpayers who live in integrated states.. "Learn more" jump link scrolls taxpayers down to the States taxes card. The "Dismiss" button makes the alert disappear.

<img width="405" alt="state_taxes_warning" src="https://github.com/user-attachments/assets/5a956c38-ac71-46f7-8634-1718fe32dba0" />

Return status banner

<img width="773" alt="return_status_banner" src="https://github.com/user-attachments/assets/5b778988-e101-4675-970b-5e9dc7be1729" />

This spot is reserved for return-level status flags that should be presented on their own like

* In progress

* Your filing method is limited to the paper path

* Knockout state

* Submitted (pending) / Accepted

* Rejected

* Post-submission errors: a catch all for tax returns that will never reach "accepted" or "rejected" status without DF product intervention. Why? Because MeF doesn't think the federal tax return exists, for example. There may be other errors we encounter after launch.

<img width="837" alt="inprogress_returns" src="https://github.com/user-attachments/assets/9b9a9424-6cde-4f2f-b620-4ec9335e5ee5" />

<img width="428" alt="submitted_return" src="https://github.com/user-attachments/assets/5e5cf9a1-c9c6-49e5-a699-bee1cbcc3388" />

<img width="421" alt="accepted_return" src="https://github.com/user-attachments/assets/1386eceb-f43f-4662-8f79-6b438ad070b5" />

<img width="882" alt="rejected_return" src="https://github.com/user-attachments/assets/4d1a3606-75eb-4469-8104-7399b813b22f" />

<img width="872" alt="post_submission_error" src="https://github.com/user-attachments/assets/3f7af60e-fd11-4086-9a81-f5ba8ff545b8" />

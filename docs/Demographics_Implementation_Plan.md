# Demographics Data Collection - Implementation Plan

**Project:** Reading Comprehension App - Enhanced Data Collection
**Date Created:** 2025-11-24
**Status:** Planning Phase
**Contact:** user@kth.se
**Course:** DM2730 Technology Enhanced Learning - KTH

---

## Overview

This implementation adds demographic data collection to the reading comprehension study, including:
- User age
- University attendance status
- English fluency level
- First language
- SWESAT (Högskoleprovet) experience

The data will be collected on the landing page, stored in the database, and displayed on the results page.

---

## Implementation Phases

### ✅ Phase 0: Planning & Documentation
**Status:** Complete
**Deliverable:** This implementation plan

---

### 🔄 Phase 1: Database Migration
**Priority:** HIGH (Must be done first)
**Estimated Time:** 15-20 minutes
**Dependencies:** None

#### Tasks:

1. **Create Migration File**
   - File: `/migrations/0004_add_user_demographics.sql`
   - Add 5 new columns to `sessions` table
   - Add indexes for efficient querying
   - Include CHECK constraints for data validation

2. **Migration Content:**
   ```sql
   -- Add demographic fields to sessions table
   ALTER TABLE sessions ADD COLUMN age INTEGER;
   ALTER TABLE sessions ADD COLUMN has_attended_university TEXT
     CHECK(has_attended_university IN ('yes', 'no', 'currently_attending'));
   ALTER TABLE sessions ADD COLUMN english_fluency TEXT
     CHECK(english_fluency IN ('not_at_all', 'young_age', 'high_school', 'university', 'first_language'));
   ALTER TABLE sessions ADD COLUMN first_language TEXT;
   ALTER TABLE sessions ADD COLUMN completed_swesat TEXT
     CHECK(completed_swesat IN ('yes', 'no', 'unsure'));

   -- Create indexes for demographic queries
   CREATE INDEX idx_sessions_age ON sessions(age);
   CREATE INDEX idx_sessions_english_fluency ON sessions(english_fluency);
   CREATE INDEX idx_sessions_university ON sessions(has_attended_university);
   ```

3. **Apply Migration**
   - Test locally with Wrangler: `npx wrangler d1 execute read-the-text-db --local --file=migrations/0004_add_user_demographics.sql`
   - Apply to production: `npx wrangler d1 execute read-the-text-db --file=migrations/0004_add_user_demographics.sql`

#### Acceptance Criteria:
- ✅ Migration file created and syntactically correct
- ✅ Migration applied successfully to local D1 database
- ✅ Migration applied successfully to production D1 database
- ✅ All 5 new columns exist in sessions table
- ✅ Indexes created successfully
- ✅ Existing sessions data unchanged (only new columns added)

---

### 🔄 Phase 2: TypeScript Types & Interfaces
**Priority:** HIGH
**Estimated Time:** 10-15 minutes
**Dependencies:** None (can be done in parallel with Phase 1)

#### Tasks:

1. **Update Frontend Types**
   - File: `/src/types/session.ts`
   - Add demographic fields to `Session` interface
   - Add demographic fields to `SessionCreateResponse` interface
   - Add new form data interface for landing page

2. **Update Backend Types**
   - File: `/functions/types.ts`
   - Add demographic fields to `Env` types if needed
   - Update session creation types

#### Files to Modify:

**`/src/types/session.ts`:**
```typescript
export interface Session {
  id: string;
  email: string;
  status: 'in_progress' | 'completed';
  current_passage_index: number;
  passageOrder: number[];
  total_passages: number;
  created_at: string;
  completed_at?: string;
  total_time_ms: number;
  // NEW FIELDS:
  age?: number;
  has_attended_university?: 'yes' | 'no' | 'currently_attending';
  english_fluency?: 'not_at_all' | 'young_age' | 'high_school' | 'university' | 'first_language';
  first_language?: string;
  completed_swesat?: 'yes' | 'no' | 'unsure';
}

// NEW INTERFACE:
export interface UserDemographics {
  age: number;
  hasAttendedUniversity: 'yes' | 'no' | 'currently_attending';
  englishFluency: 'not_at_all' | 'young_age' | 'high_school' | 'university' | 'first_language';
  firstLanguage: string;
  completedSwesat: 'yes' | 'no' | 'unsure';
}
```

#### Acceptance Criteria:
- ✅ All type definitions updated
- ✅ No TypeScript compilation errors
- ✅ Types match database schema
- ✅ Optional fields marked correctly

---

### 🔄 Phase 3: Landing Page UI Updates
**Priority:** HIGH
**Estimated Time:** 45-60 minutes
**Dependencies:** Phase 2 (Types)

#### Tasks:

1. **Update LandingPage Component**
   - File: `/src/components/LandingPage.tsx`
   - Add new form fields for demographics
   - Update state management
   - Add form validation
   - Update consent checkbox (simplified to 1)
   - Add research context section
   - Add contact information

2. **Form Fields to Add:**
   - Age (number input)
   - University attendance (radio buttons)
   - English fluency (radio buttons)
   - First language (text input, conditional)
   - SWESAT experience (radio buttons)

3. **UI Improvements:**
   - Add KTH/DM2730 branding
   - Add contact email: user@kth.se
   - Add "SHOW YOUR EYESIGHT WITH THE CURSOR" instruction
   - Reorganize layout with clear sections
   - Improve visual hierarchy

4. **Validation Rules:**
   - Email: required, valid email format
   - Age: required, integer, 18-99
   - University: required, one of 3 options
   - English fluency: required, one of 5 options
   - First language: required IF fluency != "first_language"
   - SWESAT: required, one of 3 options
   - Consent: required, must be checked

#### Layout Structure:
```
1. Header (KTH branding, course info)
2. Contact Information
3. About This Study (requirements, time estimate)
4. Your Information Form
   - Email
   - Age
   - University
   - English Fluency
   - First Language (conditional)
   - SWESAT
5. What Data We Collect (expanded)
6. Consent (1 checkbox)
7. Start Button
8. Footer
```

#### Acceptance Criteria:
- ✅ All form fields render correctly
- ✅ Form validation works (client-side)
- ✅ Conditional logic for first_language field works
- ✅ Submit button disabled until all required fields valid
- ✅ Error messages display appropriately
- ✅ Responsive design works on desktop
- ✅ Existing resume/restart functionality still works
- ✅ Visual design is clean and professional

---

### 🔄 Phase 4: API Updates (Backend)
**Priority:** HIGH
**Estimated Time:** 30-40 minutes
**Dependencies:** Phase 1 (Migration), Phase 2 (Types)

#### Tasks:

1. **Update Session Creation API**
   - File: `/functions/api/sessions/index.ts`
   - Accept demographic data in request body
   - Validate demographic data
   - Store demographic data in database

2. **Update Session Retrieval APIs**
   - File: `/functions/api/sessions/[id].ts`
   - Include demographic data in response
   - File: `/functions/api/sessions/check.ts`
   - Include demographic data if session exists

3. **Update Admin APIs** (Optional for now)
   - File: `/functions/api/admin/sessions.ts`
   - Include demographic data in session list
   - File: `/functions/api/admin/sessions/[id].ts`
   - Include demographic data in detail view

#### API Changes:

**POST `/api/sessions` - Request Body:**
```json
{
  "email": "user@example.com",
  "age": 25,
  "hasAttendedUniversity": "currently_attending",
  "englishFluency": "university",
  "firstLanguage": "Swedish",
  "completedSwesat": "yes"
}
```

**GET `/api/sessions/:id` - Response:**
```json
{
  "session": {
    "id": "...",
    "email": "...",
    "age": 25,
    "has_attended_university": "currently_attending",
    "english_fluency": "university",
    "first_language": "Swedish",
    "completed_swesat": "yes",
    ...
  },
  "passageResults": [...],
  "attempts": [...]
}
```

#### Validation Rules (Backend):
- Age: integer, 18 <= age <= 99
- University: must be one of ['yes', 'no', 'currently_attending']
- English fluency: must be one of ['not_at_all', 'young_age', 'high_school', 'university', 'first_language']
- First language: string, max 100 chars, required if fluency != 'first_language'
- SWESAT: must be one of ['yes', 'no', 'unsure']

#### Acceptance Criteria:
- ✅ Session creation accepts demographic data
- ✅ Validation rejects invalid data
- ✅ Data stored correctly in database
- ✅ Session retrieval returns demographic data
- ✅ Existing sessions without demographics still work
- ✅ API errors return meaningful messages

---

### 🔄 Phase 5: Results Page Updates
**Priority:** MEDIUM
**Estimated Time:** 30-40 minutes
**Dependencies:** Phase 2 (Types), Phase 4 (API)

#### Tasks:

1. **Update ResultsPage Component**
   - File: `/src/components/ResultsPage.tsx`
   - Add demographics display section
   - Position it prominently at the top
   - Style consistently with existing design

2. **Display Demographics:**
   - Age
   - University attendance
   - English fluency
   - First language (if applicable)
   - SWESAT experience

3. **UI Design:**
   - Add "Your Profile" card above "Performance Summary"
   - Use icons for visual appeal
   - Handle missing demographics gracefully (for old sessions)
   - Keep it concise and readable

#### Layout Structure:
```
1. Header (Session Completed)
2. Your Profile Card [NEW]
   - Age
   - University
   - English Fluency
   - First Language
   - SWESAT
3. Performance Summary (existing)
4. Reading Pattern Analysis (existing)
5. Footer
```

#### Acceptance Criteria:
- ✅ Demographics display correctly for new sessions
- ✅ Old sessions without demographics still render (graceful fallback)
- ✅ Styling matches existing design system
- ✅ Mobile responsive
- ✅ All text is clear and readable
- ✅ Icons enhance readability

---

### 🔄 Phase 6: Integration & Testing
**Priority:** HIGH
**Estimated Time:** 30-45 minutes
**Dependencies:** All previous phases

#### Tasks:

1. **End-to-End Testing:**
   - Create new session with demographics
   - Complete all 10 passages
   - Verify demographics saved correctly
   - View results page with demographics
   - Test resume functionality
   - Test with different demographic combinations

2. **Edge Case Testing:**
   - Very young age (18)
   - Very old age (99)
   - English as first language (no first_language field)
   - Non-English first language
   - Long language names
   - Special characters in names
   - Empty/null values

3. **Backward Compatibility Testing:**
   - Check old sessions without demographics
   - Ensure they can still be viewed
   - Ensure results page doesn't break
   - Ensure admin page doesn't break

4. **Form Validation Testing:**
   - Test all validation rules
   - Test error messages
   - Test required fields
   - Test conditional fields
   - Test submit button enable/disable

5. **API Testing:**
   - Test session creation with valid data
   - Test session creation with invalid data
   - Test session retrieval
   - Test check email endpoint

#### Test Scenarios:

**Scenario 1: New User - English First Language**
```
Email: test1@example.com
Age: 23
University: Currently attending
English: First language
First Language: [empty/disabled]
SWESAT: Yes
Expected: Session created, data saved, results display correctly
```

**Scenario 2: New User - Non-English Native**
```
Email: test2@example.com
Age: 28
University: Yes
English: Learned at university
First Language: Swedish
SWESAT: No
Expected: Session created, data saved, results display correctly
```

**Scenario 3: Resume Old Session (No Demographics)**
```
Email: [existing old session email]
Expected: Can resume, no demographics shown, no errors
```

**Scenario 4: Invalid Data**
```
Age: 150 (too old)
Expected: Validation error, cannot submit
```

#### Acceptance Criteria:
- ✅ All test scenarios pass
- ✅ No console errors
- ✅ No TypeScript errors
- ✅ No runtime errors
- ✅ Data persists correctly
- ✅ UI renders correctly in all states
- ✅ Backward compatibility maintained

---

### 🔄 Phase 7: CSS Styling & Polish
**Priority:** MEDIUM
**Estimated Time:** 20-30 minutes
**Dependencies:** Phase 3, Phase 5

#### Tasks:

1. **Landing Page Styling:**
   - Ensure consistent spacing
   - Improve visual hierarchy
   - Add section dividers
   - Style form inputs consistently
   - Style radio buttons/checkboxes
   - Add hover states
   - Ensure accessibility (focus states)

2. **Results Page Styling:**
   - Match existing card style
   - Consistent typography
   - Proper spacing
   - Icon alignment

3. **Responsive Design:**
   - Test on different screen sizes
   - Ensure forms are usable
   - Ensure text is readable
   - Ensure buttons are tappable

4. **Accessibility:**
   - Proper label associations
   - ARIA attributes where needed
   - Keyboard navigation
   - Screen reader friendly

#### Acceptance Criteria:
- ✅ Visually consistent with existing design
- ✅ Professional appearance
- ✅ No layout issues
- ✅ Responsive on all desktop sizes
- ✅ Accessible via keyboard
- ✅ Clear visual feedback for interactions

---

### 🔄 Phase 8: Documentation & Deployment
**Priority:** MEDIUM
**Estimated Time:** 15-20 minutes
**Dependencies:** All previous phases

#### Tasks:

1. **Update README.md:**
   - Document new demographic fields
   - Update data collection section
   - Add migration instructions
   - Update setup instructions if needed

2. **Update Environment Variables:**
   - Ensure no new env vars needed
   - Document any changes

3. **Deployment Checklist:**
   - [ ] Run migration on production database
   - [ ] Test migration success
   - [ ] Deploy frontend changes
   - [ ] Deploy backend (functions) changes
   - [ ] Smoke test in production
   - [ ] Monitor for errors

4. **Git Commit Strategy:**
   ```bash
   git checkout -b feature/demographics-collection
   git add migrations/0004_add_user_demographics.sql
   git commit -m "feat: add demographics database migration"

   git add src/types/session.ts functions/types.ts
   git commit -m "feat: add demographic types"

   git add src/components/LandingPage.tsx
   git commit -m "feat: update landing page with demographics form"

   git add functions/api/sessions/
   git commit -m "feat: update session APIs to handle demographics"

   git add src/components/ResultsPage.tsx
   git commit -m "feat: display demographics on results page"

   git push origin feature/demographics-collection
   ```

#### Acceptance Criteria:
- ✅ All changes committed with clear messages
- ✅ README updated
- ✅ Migration applied to production
- ✅ Code deployed to production
- ✅ Production smoke test passed
- ✅ No errors in production logs

---

## File Changes Summary

### Files to Create:
1. `/migrations/0004_add_user_demographics.sql` - New migration

### Files to Modify:
1. `/src/types/session.ts` - Add demographic types
2. `/functions/types.ts` - Update backend types
3. `/src/components/LandingPage.tsx` - Add demographics form
4. `/src/components/ResultsPage.tsx` - Display demographics
5. `/functions/api/sessions/index.ts` - Handle demographics in session creation
6. `/functions/api/sessions/[id].ts` - Return demographics in session data
7. `/functions/api/sessions/check.ts` - Include demographics in check response
8. `/README.md` - Document changes

### Files to Review (No Changes Expected):
- `/src/App.tsx` - Should work without changes
- `/src/components/ReadingComprehension.tsx` - Should work without changes
- `/functions/api/passages/` - Should work without changes

---

## Rollback Plan

If issues arise, rollback in reverse order:

1. **Revert Frontend:** Deploy previous version of frontend
2. **Revert Backend:** Deploy previous version of functions
3. **Keep Migration:** Database migration can stay (new columns nullable, won't break old code)

### Rollback Commands:
```bash
# Revert to previous commit
git revert HEAD~8..HEAD

# Or checkout previous working branch
git checkout main
npm run deploy

# Migration rollback (if absolutely necessary):
# Run this SQL manually:
ALTER TABLE sessions DROP COLUMN age;
ALTER TABLE sessions DROP COLUMN has_attended_university;
ALTER TABLE sessions DROP COLUMN english_fluency;
ALTER TABLE sessions DROP COLUMN first_language;
ALTER TABLE sessions DROP COLUMN completed_swesat;
DROP INDEX idx_sessions_age;
DROP INDEX idx_sessions_english_fluency;
DROP INDEX idx_sessions_university;
```

---

## Success Metrics

### Technical Success:
- ✅ Zero errors in production logs
- ✅ All new sessions include demographic data
- ✅ Old sessions still accessible
- ✅ Page load times unchanged (<2s)
- ✅ Form submission success rate >99%

### User Experience Success:
- ✅ Form completion rate >90%
- ✅ Clear instructions understood
- ✅ No user-reported confusion
- ✅ Consent clearly understood

### Data Quality:
- ✅ <5% invalid/missing demographic data
- ✅ Reasonable age distribution (18-70)
- ✅ Language data populated when required

---

## Post-Implementation Tasks

1. **Monitor Production:**
   - Check error logs daily for 1 week
   - Monitor form completion rates
   - Check data quality in admin panel

2. **Future Enhancements:**
   - Add admin page demographic filters (Phase 9)
   - Add demographic data export to CSV
   - Add analytics dashboard for researchers
   - Add data visualization of demographics

3. **Research Analysis:**
   - Begin correlating demographics with reading patterns
   - Analyze age vs. reading speed
   - Analyze English fluency vs. comprehension
   - Publish findings

---

## Contact & Support

- **Technical Issues:** user@kth.se
- **Research Questions:** user@kth.se
- **Course:** DM2730 Technology Enhanced Learning
- **Institution:** KTH Royal Institute of Technology

---

## Appendix: Field Mapping Reference

| Frontend Field | Database Column | Type | Values |
|----------------|-----------------|------|--------|
| age | age | INTEGER | 18-99 |
| hasAttendedUniversity | has_attended_university | TEXT | 'yes', 'no', 'currently_attending' |
| englishFluency | english_fluency | TEXT | 'not_at_all', 'young_age', 'high_school', 'university', 'first_language' |
| firstLanguage | first_language | TEXT | Free text (max 100 chars) |
| completedSwesat | completed_swesat | TEXT | 'yes', 'no', 'unsure' |

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-24 | Claude AI | Initial implementation plan created |

---

**End of Implementation Plan**

import unittest
from skill_matcher import SkillMatcher

class TestSkillMatcher(unittest.TestCase):
    def setUp(self):
        self.matcher = SkillMatcher()

    def test_hr_resume_matches(self):
        resume_text = """
        Candidate communication, interview coordination, employee onboarding,
        HR documentation, Microsoft Excel, confidentiality, and updated attendance
        and leave records for a team of 75 employees.
        """
        norm_resume = self.matcher.normalize_text(resume_text)

        # Test Candidate Communication (should directly match Communication Skills because it is an alias)
        status, _ = self.matcher.evaluate_skill("Communication Skills", norm_resume)
        self.assertEqual(status, "DIRECT_MATCH")

        # Test Attendance and Leave Management (should directly match because of normalized match)
        status, _ = self.matcher.evaluate_skill("Attendance and Leave Management", norm_resume)
        self.assertEqual(status, "DIRECT_MATCH")

        # Test Compliance (should be NOT_EVIDENCED since no compliance term is in the resume)
        status, _ = self.matcher.evaluate_skill("Compliance", norm_resume)
        self.assertEqual(status, "NOT_EVIDENCED")

        # Test other matched skills
        status, _ = self.matcher.evaluate_skill("Confidentiality", norm_resume)
        self.assertEqual(status, "DIRECT_MATCH")
        
        status, _ = self.matcher.evaluate_skill("Employee Onboarding", norm_resume)
        self.assertEqual(status, "DIRECT_MATCH")

        status, _ = self.matcher.evaluate_skill("HR Documentation", norm_resume)
        self.assertEqual(status, "DIRECT_MATCH")

        status, _ = self.matcher.evaluate_skill("MS Excel", norm_resume)
        self.assertEqual(status, "DIRECT_MATCH")

    def test_prevent_false_positives(self):
        # "digital" must not match "Git"
        norm_res1 = self.matcher.normalize_text("digital onboarding process")
        status, _ = self.matcher.evaluate_skill("Git", norm_res1)
        self.assertEqual(status, "NOT_EVIDENCED")

        # "LinkedIn" must not match "LinkedIn Recruiter"
        norm_res2 = self.matcher.normalize_text("active on LinkedIn profile")
        status, _ = self.matcher.evaluate_skill("LinkedIn Recruiter", norm_res2)
        self.assertEqual(status, "NOT_EVIDENCED")

        # "Zoho CRM" related evidence for "Salesforce"
        norm_res3 = self.matcher.normalize_text("worked daily with Zoho CRM tool")
        status, evidence = self.matcher.evaluate_skill("Salesforce", norm_res3)
        self.assertEqual(status, "RELATED_EVIDENCE")
        self.assertIsNotNone(evidence)
        self.assertEqual(evidence["jobSkill"], "Salesforce")
        self.assertEqual(evidence["resumeEvidence"], "Zoho Crm")

if __name__ == '__main__':
    unittest.main()

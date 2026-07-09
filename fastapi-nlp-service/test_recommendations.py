import unittest
from recommendation_templates import detect_job_domain, get_domain_bullets

class TestRecommendations(unittest.TestCase):
    def test_job_domain_detection(self):
        self.assertEqual(detect_job_domain("Software Engineer", "React developer needed"), "software_technical")
        self.assertEqual(detect_job_domain("HR Executive", "Recruitment and onboarding"), "hr_people_operations")
        self.assertEqual(detect_job_domain("Sales Executive", "CRM and closing deals"), "sales")

    def test_no_tech_words_for_hr(self):
        bullets = get_domain_bullets(["Compliance", "HRIS"], ["Communication Skills"], "hr_people_operations")
        self.assertTrue(len(bullets) > 0)
        for b in bullets:
            bullet_text = b["suggestedBullet"].lower()
            self.assertNotIn("routes", bullet_text)
            self.assertNotIn("database schema", bullet_text)
            self.assertNotIn("data structures", bullet_text)
            self.assertNotIn("api endpoints", bullet_text)
            self.assertNotIn("build an application", bullet_text)

if __name__ == '__main__':
    unittest.main()

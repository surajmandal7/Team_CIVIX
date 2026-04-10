#!/usr/bin/env python3
"""
CIVIX Backend API Testing Suite
Tests all API endpoints for the hyperlocal services platform
"""

import requests
import sys
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

class CivixAPITester:
    def __init__(self, base_url="https://civix-urban.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.access_token = None
        self.refresh_token = None
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_user_id = None

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} | {name}")
        if details:
            print(f"    {details}")
        
        if success:
            self.tests_passed += 1
        else:
            self.failed_tests.append({"name": name, "details": details})

    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    expected_status: int = 200, use_auth: bool = False) -> tuple:
        """Make HTTP request and return success status and response"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        if use_auth and self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'

        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=headers)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, headers=headers)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text, "status_code": response.status_code}

            return success, response_data

        except Exception as e:
            return False, {"error": str(e)}

    def test_health_endpoint(self):
        """Test health check endpoint"""
        success, response = self.make_request('GET', '/health')
        if success and response.get('status') == 'healthy':
            self.log_test("Health Check", True, f"Status: {response.get('status')}, City: {response.get('city')}")
        else:
            self.log_test("Health Check", False, f"Response: {response}")

    def test_categories_endpoint(self):
        """Test categories endpoint"""
        success, response = self.make_request('GET', '/categories')
        if success and isinstance(response, list) and len(response) > 0:
            categories = [cat.get('name') for cat in response if 'name' in cat]
            self.log_test("Get Categories", True, f"Found {len(response)} categories: {', '.join(categories[:3])}...")
        else:
            self.log_test("Get Categories", False, f"Response: {response}")

    def test_areas_endpoint(self):
        """Test areas endpoint"""
        success, response = self.make_request('GET', '/areas')
        if success and isinstance(response, list) and len(response) > 0:
            self.log_test("Get Areas", True, f"Found {len(response)} areas: {', '.join(response[:3])}...")
        else:
            self.log_test("Get Areas", False, f"Response: {response}")

    def test_services_endpoint(self):
        """Test services endpoint"""
        success, response = self.make_request('GET', '/services')
        if success and 'services' in response:
            services = response['services']
            total = response.get('total', 0)
            self.log_test("Get Services", True, f"Found {len(services)} services, Total: {total}")
            
            # Test with filters
            success2, response2 = self.make_request('GET', '/services?category=plumbing&limit=5')
            if success2:
                plumbing_services = response2.get('services', [])
                self.log_test("Get Services with Filter", True, f"Found {len(plumbing_services)} plumbing services")
            else:
                self.log_test("Get Services with Filter", False, f"Response: {response2}")
        else:
            self.log_test("Get Services", False, f"Response: {response}")

    def test_emergency_services(self):
        """Test emergency services endpoint"""
        success, response = self.make_request('GET', '/emergency-services')
        if success and isinstance(response, list):
            emergency_count = len(response)
            self.log_test("Get Emergency Services", True, f"Found {emergency_count} emergency services")
        else:
            self.log_test("Get Emergency Services", False, f"Response: {response}")

    def test_user_registration(self):
        """Test user registration"""
        timestamp = int(time.time())
        test_user = {
            "email": f"test_user_{timestamp}@civix.com",
            "password": "TestPass123!",
            "name": f"Test User {timestamp}",
            "phone": "+91 9876543222"
        }
        
        success, response = self.make_request('POST', '/auth/register', test_user, 200)
        if success and 'id' in response and 'token' in response:
            self.test_user_id = response['id']
            self.access_token = response['token']
            self.log_test("User Registration", True, f"User ID: {self.test_user_id}")
        else:
            self.log_test("User Registration", False, f"Response: {response}")

    def test_admin_login(self):
        """Test admin login"""
        admin_creds = {
            "email": "admin@civix.com",
            "password": "admin123"
        }
        
        success, response = self.make_request('POST', '/auth/login', admin_creds, 200)
        if success and 'id' in response and 'token' in response:
            self.access_token = response['token']
            admin_role = response.get('role', 'user')
            self.log_test("Admin Login", True, f"Role: {admin_role}, Token received")
        else:
            self.log_test("Admin Login", False, f"Response: {response}")

    def test_auth_me_endpoint(self):
        """Test /auth/me endpoint"""
        if not self.access_token:
            self.log_test("Auth Me", False, "No access token available")
            return
            
        success, response = self.make_request('GET', '/auth/me', use_auth=True)
        if success and 'email' in response:
            email = response.get('email')
            role = response.get('role', 'user')
            self.log_test("Auth Me", True, f"Email: {email}, Role: {role}")
        else:
            self.log_test("Auth Me", False, f"Response: {response}")

    def test_bookmarks_functionality(self):
        """Test bookmarks endpoints"""
        if not self.access_token:
            self.log_test("Bookmarks Test", False, "No access token available")
            return

        # First get a service to bookmark
        success, services_response = self.make_request('GET', '/services?limit=1')
        if not success or not services_response.get('services'):
            self.log_test("Bookmarks Test", False, "No services available to bookmark")
            return

        service_id = services_response['services'][0]['id']
        
        # Add bookmark
        bookmark_data = {"service_id": service_id}
        success, response = self.make_request('POST', '/bookmarks', bookmark_data, 200, use_auth=True)
        if success:
            self.log_test("Add Bookmark", True, f"Bookmarked service: {service_id}")
            
            # Get bookmarks
            success2, bookmarks = self.make_request('GET', '/bookmarks', use_auth=True)
            if success2 and isinstance(bookmarks, list):
                self.log_test("Get Bookmarks", True, f"Found {len(bookmarks)} bookmarks")
                
                # Remove bookmark
                success3, remove_response = self.make_request('DELETE', f'/bookmarks/{service_id}', use_auth=True)
                if success3:
                    self.log_test("Remove Bookmark", True, "Bookmark removed successfully")
                else:
                    self.log_test("Remove Bookmark", False, f"Response: {remove_response}")
            else:
                self.log_test("Get Bookmarks", False, f"Response: {bookmarks}")
        else:
            self.log_test("Add Bookmark", False, f"Response: {response}")

    def test_ai_voice_search(self):
        """Test AI voice search endpoint"""
        voice_query = {
            "query": "Bhaiya koi electrician hai kya paas mein?"
        }
        
        success, response = self.make_request('POST', '/ai/voice-search', voice_query, 200)
        if success and 'search_terms' in response:
            category = response.get('service_category')
            terms = response.get('search_terms')
            urgency = response.get('urgency')
            self.log_test("AI Voice Search", True, f"Category: {category}, Terms: {terms}, Urgency: {urgency}")
        else:
            self.log_test("AI Voice Search", False, f"Response: {response}")

    def test_service_detail(self):
        """Test service detail endpoint"""
        # Get a service first
        success, services_response = self.make_request('GET', '/services?limit=1')
        if not success or not services_response.get('services'):
            self.log_test("Service Detail", False, "No services available")
            return

        service_id = services_response['services'][0]['id']
        success, response = self.make_request('GET', f'/services/{service_id}')
        if success and 'id' in response:
            name = response.get('name')
            category = response.get('category')
            rating = response.get('rating')
            self.log_test("Service Detail", True, f"Service: {name}, Category: {category}, Rating: {rating}")
        else:
            self.log_test("Service Detail", False, f"Response: {response}")

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        if not self.access_token:
            self.log_test("Dashboard Stats", False, "No access token available")
            return
            
        success, response = self.make_request('GET', '/dashboard/stats', use_auth=True)
        if success and 'bookmarks_count' in response:
            bookmarks = response.get('bookmarks_count')
            reviews = response.get('reviews_count')
            self.log_test("Dashboard Stats", True, f"Bookmarks: {bookmarks}, Reviews: {reviews}")
        else:
            self.log_test("Dashboard Stats", False, f"Response: {response}")

    def test_logout(self):
        """Test logout endpoint"""
        success, response = self.make_request('POST', '/auth/logout', expected_status=200)
        if success and 'message' in response:
            self.log_test("Logout", True, response.get('message'))
            self.access_token = None
        else:
            self.log_test("Logout", False, f"Response: {response}")

    def run_all_tests(self):
        """Run all test cases"""
        print("🚀 Starting CIVIX Backend API Tests")
        print(f"📍 Testing API: {self.api_url}")
        print("=" * 60)
        
        # Basic API tests
        self.test_health_endpoint()
        self.test_categories_endpoint()
        self.test_areas_endpoint()
        self.test_services_endpoint()
        self.test_emergency_services()
        self.test_service_detail()
        
        # Auth tests
        self.test_user_registration()
        self.test_admin_login()
        self.test_auth_me_endpoint()
        
        # Protected endpoint tests
        self.test_bookmarks_functionality()
        self.test_dashboard_stats()
        
        # AI features
        self.test_ai_voice_search()
        
        # Cleanup
        self.test_logout()
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Summary:")
        print(f"   Total Tests: {self.tests_run}")
        print(f"   Passed: {self.tests_passed}")
        print(f"   Failed: {len(self.failed_tests)}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"   - {test['name']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test runner"""
    tester = CivixAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
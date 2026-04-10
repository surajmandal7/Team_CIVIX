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
            # Handle both string and dict responses
            if isinstance(response[0], dict):
                area_names = [area.get('name', str(area)) for area in response[:3]]
            else:
                area_names = response[:3]
            self.log_test("Get Areas", True, f"Found {len(response)} areas: {', '.join(area_names)}...")
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

    def test_stats_api(self):
        """Test stats API for 37 total services"""
        success, response = self.make_request('GET', '/stats')
        if success and 'total_services' in response:
            total_services = response.get('total_services')
            total_reviews = response.get('total_reviews', 0)
            emergency_services = response.get('emergency_services', 0)
            verified_services = response.get('verified_services', 0)
            
            # Check if we have 37 services as required
            if total_services == 37:
                self.log_test("Stats API - 37 Services", True, f"Total: {total_services}, Emergency: {emergency_services}, Verified: {verified_services}")
            else:
                self.log_test("Stats API - 37 Services", False, f"Expected 37 services, got {total_services}")
        else:
            self.log_test("Stats API", False, f"Response: {response}")

    def test_intelligent_search_hinglish(self):
        """Test AI Intelligent Search with Hinglish queries"""
        # Test 1: 'bijli band hai' should return electrical services
        query1 = {
            "query": "bijli band hai",
            "latitude": 22.7857,
            "longitude": 86.2029,
            "radius_km": 5.0
        }
        
        success1, response1 = self.make_request('POST', '/search/intelligent', query1, 200)
        if success1 and 'parsed_intent' in response1:
            intent = response1['parsed_intent']
            category = intent.get('service_category')
            is_urgent = response1.get('is_urgent', False)
            services = response1.get('services', [])
            
            if category == 'electrical':
                self.log_test("AI Search - 'bijli band hai'", True, f"Category: {category}, Urgent: {is_urgent}, Services: {len(services)}")
            else:
                self.log_test("AI Search - 'bijli band hai'", False, f"Expected 'electrical', got '{category}'")
        else:
            self.log_test("AI Search - 'bijli band hai'", False, f"Response: {response1}")

        # Test 2: 'biryani khaana hai' should return restaurants
        query2 = {
            "query": "biryani khaana hai",
            "latitude": 22.7857,
            "longitude": 86.2029,
            "radius_km": 5.0
        }
        
        success2, response2 = self.make_request('POST', '/search/intelligent', query2, 200)
        if success2 and 'parsed_intent' in response2:
            intent = response2['parsed_intent']
            category = intent.get('service_category')
            services = response2.get('services', [])
            
            if category == 'restaurant':
                self.log_test("AI Search - 'biryani khaana hai'", True, f"Category: {category}, Services: {len(services)}")
            else:
                self.log_test("AI Search - 'biryani khaana hai'", False, f"Expected 'restaurant', got '{category}'")
        else:
            self.log_test("AI Search - 'biryani khaana hai'", False, f"Response: {response2}")

    def test_whatsapp_onboarding(self):
        """Test WhatsApp onboarding API"""
        whatsapp_text = {
            "raw_text": "Hi! I am Ravi Kumar, plumber in Bistupur. 15 years experience. All types of plumbing work - leak fixing, pipe repair, bathroom fitting. Call 9876543210. Available 24/7 for emergency. Very reasonable rates."
        }
        
        success, response = self.make_request('POST', '/onboard/whatsapp', whatsapp_text, 200)
        if success and 'extracted_data' in response:
            extracted = response['extracted_data']
            name = extracted.get('name')
            category = extracted.get('category')
            phone = extracted.get('phone')
            is_emergency = extracted.get('is_emergency', False)
            
            self.log_test("WhatsApp Onboarding", True, f"Name: {name}, Category: {category}, Phone: {phone}, Emergency: {is_emergency}")
        else:
            self.log_test("WhatsApp Onboarding", False, f"Response: {response}")

    def test_category_filters(self):
        """Test category filtering functionality"""
        # Test restaurant category filter
        success, response = self.make_request('GET', '/services?category=restaurant')
        if success and 'services' in response:
            restaurant_services = response['services']
            restaurant_count = len(restaurant_services)
            
            # Verify all returned services are restaurants
            all_restaurants = all(service.get('category') == 'restaurant' for service in restaurant_services)
            
            if all_restaurants and restaurant_count > 0:
                self.log_test("Category Filter - Restaurant", True, f"Found {restaurant_count} restaurant services")
            else:
                self.log_test("Category Filter - Restaurant", False, f"Filter not working properly, got {restaurant_count} services")
        else:
            self.log_test("Category Filter - Restaurant", False, f"Response: {response}")

        # Test electrical category filter
        success, response = self.make_request('GET', '/services?category=electrical')
        if success and 'services' in response:
            electrical_services = response['services']
            electrical_count = len(electrical_services)
            
            all_electrical = all(service.get('category') == 'electrical' for service in electrical_services)
            
            if all_electrical and electrical_count > 0:
                self.log_test("Category Filter - Electrical", True, f"Found {electrical_count} electrical services")
            else:
                self.log_test("Category Filter - Electrical", False, f"Filter not working properly, got {electrical_count} services")
        else:
            self.log_test("Category Filter - Electrical", False, f"Response: {response}")

        # Test plumbing category filter
        success, response = self.make_request('GET', '/services?category=plumbing')
        if success and 'services' in response:
            plumbing_services = response['services']
            plumbing_count = len(plumbing_services)
            
            all_plumbing = all(service.get('category') == 'plumbing' for service in plumbing_services)
            
            if all_plumbing and plumbing_count > 0:
                self.log_test("Category Filter - Plumbing", True, f"Found {plumbing_count} plumbing services")
            else:
                self.log_test("Category Filter - Plumbing", False, f"Filter not working properly, got {plumbing_count} services")
        else:
            self.log_test("Category Filter - Plumbing", False, f"Response: {response}")

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
        
        # Stats API test (37 services requirement)
        self.test_stats_api()
        
        # Category filter tests
        self.test_category_filters()
        
        # Auth tests
        self.test_user_registration()
        self.test_admin_login()
        self.test_auth_me_endpoint()
        
        # Protected endpoint tests
        self.test_bookmarks_functionality()
        self.test_dashboard_stats()
        
        # AI features
        self.test_ai_voice_search()
        self.test_intelligent_search_hinglish()
        self.test_whatsapp_onboarding()
        
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
# Copyright (c) 2021, SourceFuse and Contributors
# See license.txt
import frappe
import unittest
import json
from tag_workflow.tag_data import claim_order_insert,update_timesheet,company_details,staff_org_details,update_staffing_user_with_exclusive, check_assign_employee,job_site_contact,hiring_category,org_industy_type,disable_user
JO='Job Order'
jo_test_records = frappe.get_test_records(JO)
GTS='Genpact Test44 Staffing'
GTST='Genpact Test Staffing'
userGT='test_genpact_test_staffing4422@yopmail.com'
userGTA='test_genpact_test_staffingadmin4422@yopmail.com'
class TestTagData(unittest.TestCase):
	def test_claim_order_insert(self):
		records_file = open('assets/tag_workflow/js/test_records/test_records.json')
		test_records = json.load(records_file)
		self.create_company(test_records)
		for record in jo_test_records:
			job_order = frappe.new_doc(JO)
			job_order.company = record['company']
			job_order.select_job = record['select_job']
			job_order.from_date = record['from_date']
			job_order.job_start_time = record['job_start_time']
			job_order.availability = record['availability']
			job_order.rate = record['rate']
			job_order.to_date = record['to_date']
			job_order.category = record['category']
			job_order.job_site = record['job_site']
			job_order.no_of_workers = record['no_of_workers']
			job_order.e_signature_full_name = record['e_signature_full_name']
			job_order.agree_to_contract = record['agree_to_contract']
			job_order.estimated_hours_per_day=record['estimated_hours_per_day']
			job_order.staff_company=record['staff_company']
			job_order.per_hour=record['per_hour']
			job_order.flat_rate=record['flat_rate']
			job_order.save()
			if isinstance(record['per_hour'], str):
				try:
					pay_rate=round(record['per_hour'] + record['flat_rate'],2)
				except Exception as e:
					if str(e)=="must be str, not int":
						break
			result=claim_order_insert(pay_rate, job_order.company,job_order.name,job_order.no_of_workers,job_order.e_signature_full_name,job_order.staff_company)
			self.assertEqual(1,result)
			job_order_updated = frappe.get_doc(JO, job_order.name)
			self.assertEqual(1,job_order_updated.bid)
			self.assertEqual('Genpact Staffing',job_order_updated.claim)
			self.assertEqual('Genpact Staffing',job_order_updated.staff_org_claimed)
			self.delete_test_data(job_order.name)	

	def create_company(self,test_records):
		for record in test_records:
			company_exists=frappe.db.get_value('Company',{'company_name':record['company_name']},'name')
			if not company_exists:
				company_doc = frappe.new_doc("Company")
				company_doc.company_name=record['company_name']
				company_doc.organization_type=record['organization_type']
				company_doc.accounts_payable_contact_name=record['accounts_payable_contact_name']
				company_doc.fein=record['fein']
				company_doc.title=record['title']
				company_doc.accounts_payable_email=record['accounts_payable_email']
				company_doc.accounts_payable_phone_number=record['accounts_payable_phone_number']
				company_doc.contact_name=record['contact_name']
				company_doc.phone_no=record['phone_no']
				company_doc.email=record['email']
				company_doc.enter_manually=record['enter_manually']
				company_doc.address=record['address']
				company_doc.state=record['state']
				company_doc.city=record['city'] if record['city'] else None
				company_doc.zip=record['zip']
				company_doc.default_currency=record['default_currency']
				company_doc.primary_language=record['primary_language']
				if record['company_name']==GTS:
					company_doc.accounts_receivable_rep_email=record['accounts_receivable_rep_email']
					company_doc.accounts_receivable_name=record['accounts_receivable_name']
					company_doc.accounts_receivable_phone_number=record['accounts_receivable_phone_number']
					company_doc.cert_of_insurance=record['cert_of_insurance']
					company_doc.safety_manual=record['safety_manual']
					company_doc.w9=record['w9']
				for industry in record['industry_type']:
					company_doc.append('industry_type', {
						'industry_type':industry['industry_type']
					})
				company_doc.save()

	def delete_test_data(self,job_order_name):
		claim_orders= frappe.db.get_list('Claim Order', filters={'job_order':job_order_name}, fields={'name'})
		for order in claim_orders:
			frappe.delete_doc('Claim Order',order.name)
		frappe.delete_doc(JO,job_order_name)

	def test_update_timesheet(self):
		frappe.set_user("Administrator")
		for record in jo_test_records:
			job_order = frappe.new_doc(JO)
			job_order.company = record['company']
			job_order.select_job = record['select_job']
			job_order.from_date = record['from_date']
			job_order.job_start_time = record['job_start_time']
			job_order.availability = record['availability']
			job_order.rate = record['rate']
			job_order.to_date = record['to_date']
			job_order.category = record['category']
			job_order.job_site = record['job_site']
			job_order.no_of_workers = record['no_of_workers']
			job_order.e_signature_full_name = record['e_signature_full_name']
			job_order.agree_to_contract = record['agree_to_contract']
			job_order.estimated_hours_per_day=record['estimated_hours_per_day']
			job_order.staff_company=record['staff_company']
			job_order.per_hour=record['per_hour']
			job_order.flat_rate=record['flat_rate']
			job_order.save()
			select_job,from_date,to_date,hours,billing_rate,flat_rate,extra_hours,extra_rate=update_timesheet(job_order.name)
			self.assertEqual(record['expected_extra_hours'],extra_hours)
			self.assertEqual(record['expected_extra_rate'],extra_rate)
			frappe.delete_doc(JO,job_order.name)

	def test_company_details(self):
		records_file = open('assets/tag_workflow/js/test_records/test_records_company_details.json')
		test_records = json.load(records_file)
		self.create_company(test_records)
		user_exists=frappe.db.get_value('User',{'email':'test_tag_admin4422@yopmail.com'},'name')
		if not user_exists:
			user = frappe.new_doc('User')
			user.email="test_tag_admin4422@yopmail.com"
			user.organization_type="TAG"
			user.tag_user_type="TAG Admin"
			user.first_name="Test TAG Admin"
			user.company="TAG"
			user.save()
		frappe.set_user("test_tag_admin4422@yopmail.com")
		#Test case 1
		fields=company_details("Genpact Test Hiring")
		self.assertEqual(['City'],fields)
		#Test case 2
		fields=company_details(GTST)
		self.assertEqual(['Industry Type', 'Accounts Payable Email'],fields)
		#Test case 3
		fields=company_details("Genpact Hiring")
		self.assertEqual('success',fields)

	def test_staff_org_details(self):
		frappe.set_user("Administrator")
		records_file = open('assets/tag_workflow/js/test_records/test_records_company_details.json')
		test_records = json.load(records_file)
		self.create_company(test_records)
		#Test case 1
		fields=staff_org_details(GTST)
		self.assertEqual(['Industry Type', 'Accounts Receivable Rep email', 'Accounts Receivable Name', 'Accounts Receivable phone number', 'Cert of Insurance', 'Safety Manual', 'W9'],fields)
		#Test case 2
		fields=staff_org_details(GTS)
		self.assertEqual('success',fields)

	def test_org_industy_type(self):
		industry_data=org_industy_type('Genpact Test Hiring')
		self.assertEqual((('IT',),),industry_data)	
		industry_data=org_industy_type(GTST)
		self.assertEqual((),industry_data)
	def test_update_staffing_user_with_exclusive(self):
		user_exists=frappe.db.get_value('User',{'email':userGT},'name')
		if not user_exists:
			user = frappe.new_doc('User')
			user.email=userGT
			user.organization_type="Staffing"
			user.tag_user_type="Staffing User"
			user.first_name="Test Genpact Test44 Staffing"
			user.company=GTS
			user.save()
		frappe.set_user(userGT)
		update_staffing_user_with_exclusive(GTS,GTS)
		doc = frappe.get_doc('Company', GTS)
		self.assertTrue(frappe.has_permission("Company", doc=doc))
		frappe.set_user("Administrator")
		user_exists=frappe.db.get_value('User',{'email':userGTA},'name')
		if not user_exists:
			user = frappe.new_doc('User')
			user.email=userGTA
			user.organization_type="Staffing"
			user.tag_user_type="Staffing Admin"
			user.first_name="Test Genpact Test44 Staffing"
			user.company=GTS
			user.save()
		frappe.set_user(userGTA)
		update_staffing_user_with_exclusive(GTS,GTS)
		doc = frappe.get_doc('Company', GTS)
		self.assertFalse(frappe.has_permission("Company", doc=doc))

	def test_check_assign_employee(self):
		#testcase1
		employee_detail='[{"employee_name":"Sara"},{"employee_name":"Yadav"},{"employee_name":"Priya K"}]'
		comparison_result=check_assign_employee('2',employee_detail)
		self.assertEqual('exceeds',comparison_result)
		#testcase2
		employee_detail='[{"employee_name":"Sara"},{"employee_name":"Sara"},{"employee_name":"Priya K"}]'
		comparison_result=check_assign_employee('2',employee_detail)
		self.assertEqual('duplicate',comparison_result)
		#testcase3
		employee_detail='[{}]'
		comparison_result=check_assign_employee('2',employee_detail)
		self.assertEqual(0,comparison_result)

	def test_job_site_contact(self):
		user_data=job_site_contact('User','','name',0,100, {'job_order_company': GTS})
		self.assertEqual(((userGT, 'Test Genpact Test44 Staffing', userGT, None), (userGTA, 'Test Genpact Test44 Staffing', userGTA, None)),user_data)
		user_data=job_site_contact('User','','name',0,100, {'job_order_company': GTST})
		self.assertEqual((),user_data)

	def test_hiring_category(self):
		industry_data=hiring_category('Industry Types','','name',0,100, {'hiring_company': 'Genpact Test Hiring'})
		self.assertEqual((('IT',),),industry_data)
		industry_data=hiring_category('Industry Types','','name',0,100, {'hiring_company': GTST})
		self.assertEqual((),industry_data)

	def test_disable_user(self):
		disable_user(GTS,"0")
		user_doc=frappe.get_doc('User', userGTA)
		self.assertEqual(1,user_doc.enabled)
		disable_user(GTS,"1")
		user_doc=frappe.get_doc('User', userGTA)
		self.assertEqual(0,user_doc.enabled)

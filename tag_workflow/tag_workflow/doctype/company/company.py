# Copyright (c) 2021, SourceFuse and contributors
# For license information, please see license.txt

from frappe.model.document import Document
import frappe
from frappe import _
from erpnext.setup.doctype.company.company import Company,install_country_fixtures
from frappe import enqueue
from frappe.utils.nestedset import NestedSet
create_default_accounts=Company.create_default_accounts
from datetime import datetime
import ast
class CustomCompany(Company):
	def on_update(self):
		NestedSet.on_update(self)
		frappe.db.commit()
		enqueue(self.update_enqueue,queue='short', is_async=True)
		
	@frappe.whitelist()
	def update_enqueue(self):
		if not frappe.db.sql("""select name from tabAccount
				where company=%s and docstatus<2 limit 1""", self.name):
			if not frappe.local.flags.ignore_chart_of_accounts:
				frappe.flags.country_change = True
				self.create_default_accounts()
				self.create_default_warehouses()

		if not frappe.db.get_value("Cost Center", {"is_group": 0, "company": self.name}):
			self.create_default_cost_center()

		if frappe.flags.country_change:
			install_country_fixtures(self.name, self.country)
			self.create_default_tax_template()

		if not frappe.db.get_value("Department", {"company": self.name}):
			from erpnext.setup.setup_wizard.operations.install_fixtures import install_post_company_fixtures
			install_post_company_fixtures(frappe._dict({'company_name': self.name}))

		if not frappe.local.flags.ignore_chart_of_accounts:
			self.set_default_accounts()
			if self.default_cash_account:
				self.set_mode_of_payment_account()

		if self.default_currency:
			frappe.db.set_value("Currency", self.default_currency, "enabled", 1)

		if hasattr(frappe.local, 'enable_perpetual_inventory') and \
			self.name in frappe.local.enable_perpetual_inventory:
			frappe.local.enable_perpetual_inventory[self.name] = self.enable_perpetual_inventory

		frappe.clear_cache()

@frappe.whitelist()
def check_ratings(company_name):
	sql = ''' select COUNT(*) from `tabHiring Company Review` where hiring_company='{}' '''.format(company_name)
	row_count = frappe.db.sql(sql)
	return row_count[0][0]>0

@frappe.whitelist()
def check_staffing_reviews(company_name):
	count_sql = ''' select COUNT(*) from `tabCompany Review` where staffing_company='{}' '''.format(company_name)
	sql_row_count = frappe.db.sql(count_sql)

	sql = ''' select COUNT(*),average_rating from `tabCompany` where company_name='{}' '''.format(company_name)
	print(sql,"*"*200)
	row_count = frappe.db.sql(sql)
	print(row_count)
	avg_rate = 0
	if sql_row_count[0][0]>=10:
		avg_rate = str(int(row_count[0][1]))

	return avg_rate


@frappe.whitelist()
def create_salary_structure(doc,method):
	company_type = frappe.db.get_value("User", {"name": frappe.session.user}, ["organization_type"])
	if company_type == "Staffing" or company_type == "TAG":
		if doc.organization_type == "Staffing" or doc.organization_type =="TAG":
			comp_name = "Basic Temp Pay_"
			if not frappe.db.exists("Salary Component", {"name":comp_name+doc.company_name}):
				doc_sal_comp = frappe.new_doc('Salary Component')
				doc_sal_comp.creation = datetime.now()
				doc_sal_comp.name = comp_name+ doc.company_name
				doc_sal_comp.owner = frappe.session.user
				doc_sal_comp.salary_component =comp_name+ doc.company_name
				doc_sal_comp.salary_component_abbr = "BTP_" + doc.company_name
				doc_sal_comp.type = "Earning"
				doc_sal_comp.company = doc.company_name
				doc_sal_comp.salary_component_name = comp_name+ doc.company_name
				doc_sal_comp.insert()

			if not frappe.db.exists("Salary Structure", {"name":"Temporary Employees_"+doc.company_name}):
				doc_sal_struct=frappe.new_doc('Salary Structure')
				doc_sal_struct.name = "Temporary Employees_"+doc.company_name
				doc_sal_struct.creation = datetime.now()
				doc_sal_struct.owner = frappe.session.user
				doc_sal_struct.docstatus = 1
				doc_sal_struct.company = doc.company_name
				doc_sal_struct.is_active = "Yes"
				doc_sal_struct.payroll_frequency = "Weekly"
				doc_sal_struct.salary_slip_based_on_timesheet = 1
				doc_sal_struct.salary_component = comp_name +doc.company_name
				doc_sal_struct.insert()

@frappe.whitelist()	
def create_certificate_records(company,cert_list):
	cert_list = ast.literal_eval(cert_list)
	sql = '''delete from `tabCertificate and Endorsement Details` where company = "{0}"'''.format(company)
	print(cert_list,type(cert_list))
	frappe.db.sql(sql)
	for certificate in cert_list:
		doc_certificate = frappe.new_doc('Certificate and Endorsement Details')
		doc_certificate.company = certificate["company"]
		doc_certificate.certificate_type = certificate["cert_type"]
		doc_certificate.attached_certificate = certificate["link"]
		doc_certificate.sequence = certificate["sequence"]
		doc_certificate.save(ignore_permissions = True)


@frappe.whitelist()
def get_previous_certificate(company):
	records = frappe.db.sql('''select company,certificate_type,attached_certificate,sequence from `tabCertificate and Endorsement Details` where company = "{0}" order by sequence'''.format(company),as_list=True)
	print(records)
	return records

@frappe.whitelist()
def get_certificate_type(cert_attribute):
	sql = '''select name from `tabCertificate and Endorsement` where name like "{}%"''' .format(cert_attribute)
	cert_name = frappe.db.sql(sql)
	return cert_name

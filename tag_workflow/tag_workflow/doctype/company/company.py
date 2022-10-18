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

				






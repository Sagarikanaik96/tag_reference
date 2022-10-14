# Copyright (c) 2021, SourceFuse and contributors
# For license information, please see license.txt

from frappe.model.document import Document
import frappe
from frappe import _
from erpnext.setup.doctype.company.company import Company,install_country_fixtures
from frappe import enqueue
from frappe.utils.nestedset import NestedSet
create_default_accounts=Company.create_default_accounts
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
def add_temp_salary_struc(owner,company,time):
	name = "Temporary Employees_"+company
	salary_com1_name = "Basic Temp Pay_"+ company
	abbr_for_basic = "BTP_" + company
	frappe.db.sql("""INSERT INTO `tabSalary Structure` (name,creation,owner,docstatus,company,is_active,payroll_frequency,salary_slip_based_on_timesheet,salary_component) VALUES ('{0}','{1}','{2}',1,'{3}',"Yes","Weekly",1,"Basic Temp Pay")""".format(name,time,owner,company))
	frappe.db.sql("""INSERT INTO `tabSalary Component` (name,creation,owner,salary_component,salary_component_abbr,type,company,salary_component_name) VALUES('{0}','{1}','{2}','{3}','{4}',"Earning",'{5}',"Basic Temp Pay")""".format(salary_com1_name,time,owner,salary_com1_name,abbr_for_basic,company))


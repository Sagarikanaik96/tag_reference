# Copyright (c) 2021, SourceFuse and contributors
# For license information, please see license.txt

from frappe.model.document import Document
import frappe
from frappe import _
from erpnext.setup.doctype.company.company import *
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

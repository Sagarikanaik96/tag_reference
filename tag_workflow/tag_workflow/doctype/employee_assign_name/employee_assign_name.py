# Copyright (c) 2021, SourceFuse and contributors
# For license information, please see license.txt

from frappe.model.document import Document
import frappe

class EmployeeAssignName(Document):
	pass



@frappe.whitelist()
def employee_email_filter(email):
	data = frappe.db.sql("""SELECT * from `tabEmployee` where user_id="{}" """.format(email), as_dict=True)
	return [ i["company"] for i in data]
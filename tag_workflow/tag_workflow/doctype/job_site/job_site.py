# Copyright (c) 2021, SourceFuse and contributors
# For license information, please see license.txt
import frappe
from frappe.model.document import Document
import re
from frappe.utils import cint

class JobSite(Document):
	pass



@frappe.whitelist()
def checkingjobsiteandjob_site_contact(job_site_name,job_site_contact=None):
	sql = "select job_site_name,job_site_contact from `tabJob Site` where job_site_name = '{0}' and job_site_contact = '{1}' ".format(job_site_name,job_site_contact)
	if frappe.db.sql(sql):
		return False
	return True





# Copyright (c) 2021, SourceFuse and contributors
# For license information, please see license.txt
import frappe
from frappe.model.document import Document
import re
from frappe.utils import cint

class JobSite(Document):
	pass




def append_number_if_name_exists_jobsite(doctype, value, fieldname="job_site", separator="-", filters=None):
    if not filters:
        filters = dict()
    filters.update({fieldname: value})
    exists = frappe.db.exists(doctype, filters)
    regex = "^{value}{separator}\\d+$".format(value=re.escape(value), separator=separator)
    
    if(exists):
        sql = """SELECT `{fieldname}` FROM `tab{doctype}` WHERE `{fieldname}` {regex_character} %s ORDER BY length({fieldname}) DESC, `{fieldname}` DESC LIMIT 1""".format(doctype=doctype, fieldname=fieldname, regex_character=frappe.db.REGEX_CHARACTER)
        last = frappe.db.sql(sql, regex)

        if last:
            count = str(cint(last[0][0].rsplit(separator, 1)[1]) + 1)
        else:
            count = "1"

        value = "{0}{1}{2}".format(value, separator, count)
    return value

@frappe.whitelist()
def checkingjobsite(job_site):
	job_site = job_site.strip()
	if not job_site.strip():
		frappe.throw(_("Abbreviation is mandatory"))
	sql = "select job_site from `tabJob Site` where job_site = '{0}' ".format(job_site)
	if frappe.db.sql(sql):
		return append_number_if_name_exists_jobsite("Job Site", job_site, fieldname="job_site", separator="-", filters=None)
	return job_site
	




@frappe.whitelist()
def checkingjobsiteandjob_site_contact(job_site_name,job_site_contact=None):
	sql = "select job_site_name,job_site_contact from `tabJob Site` where job_site_name = '{0}' and job_site_contact = '{1}' ".format(job_site_name,job_site_contact)
	if frappe.db.sql(sql):
		return False
	return True





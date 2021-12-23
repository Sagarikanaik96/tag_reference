# Copyright (c) 2021, SourceFuse and contributors
# For license information, please see license.txt
import frappe
from frappe.utils import user
from frappe.share import add
from tag_workflow.utils.notification import sendmail
from tag_workflow.utils.notification import make_system_notification
from frappe.model.document import Document
from datetime import datetime
import json

class JobOrder(Document):
	pass


@frappe.whitelist()
def joborder_notification(organizaton,doc_name,company,job_title,posting_date,job_site=None):
	change = frappe.db.sql('''select data from `tabVersion` where docname = "{}" '''.format(doc_name),as_dict= True)
	if len(change) > 2:
		data=frappe.db.sql(''' select data from `tabVersion` where docname='{}' order by modified DESC'''.format(doc_name),as_list=1)
		new_data=json.loads(data[0][0])
		if(new_data['changed'][0][0]=='no_of_workers'):
			msg = 'The number of employees requested for '+doc_name+' on '+str(datetime.now())+' has been modified. '
			is_send_mail_required(organizaton,doc_name,msg)
		else:
			msg = f'{company} has updated details for {job_title} work order at {job_site} for {posting_date}. Please review work order details.'
			is_send_mail_required(organizaton,doc_name,msg)

def is_send_mail_required(organizaton,doc_name,msg):
	try:
		staffing = organizaton.split(',')[1:]
		staffing_list = []
		for name in staffing:
			staffing_name = frappe.db.sql('''select name from `tabUser` where company = "{}"'''.format(name.strip()),as_list = True) 
			for value in staffing_name:
				staffing_list.append(value[0])
		subject = 'Job Order Notification'
		if staffing_list:
			make_system_notification(staffing_list, message = msg, doctype = "Job Order",docname =  doc_name, subject = subject)
			sendmail(emails = staffing_list, message = msg, subject = subject, doctype = 'Job Order', docname = doc_name)
	except Exception as e:
		frappe.log_error(e, "Job Order Notification Error")
		frappe.throw(e)


@frappe.whitelist()
def get_jobtitle_list(doctype, txt, searchfield, page_len, start, filters):
	company=filters.get('job_order_company')
	if company is None:
		return None
	else:
		return frappe.db.sql(''' select job_titles from `tabJob Titles` where parent=%(company)s''',{'company':company})


@frappe.whitelist()	
def update_joborder_rate_desc(company = None,job = None):
	if job is None or company is None:
		return None

	org_detail = frappe.db.sql(''' select wages,description from `tabJob Titles` where parent = "{}" and job_titles = "{}"'''.format(company,job),as_dict=True)
	if org_detail:
		return org_detail[0]

@frappe.whitelist()
def after_denied_joborder(staff_company,joborder_name):
	share_list = frappe.db.sql('''select email from `tabUser` where organization_type='staffing' and company != "{}"'''.format(staff_company),as_list = True)
	if share_list:
		for user in share_list:
			add("Job Order", joborder_name, user[0], read=1,write=0, share=1, everyone=0, notify=0,flags={"ignore_share_permission": 1})
	try:
		jb_ord = frappe.get_doc('Job Order',joborder_name)
		jb_ord.is_single_share = 0
		jb_ord.save(ignore_permissions = True)
	except Exception as e:
		frappe.log_error(e,'job order not found')
		
	return True
		
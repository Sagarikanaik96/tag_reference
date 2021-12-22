# Copyright (c) 2021, SourceFuse and contributors
# For license information, please see license.txt
import frappe
from frappe.utils import user
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

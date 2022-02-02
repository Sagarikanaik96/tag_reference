# Copyright (c) 2022, SourceFuse and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from tag_workflow.tag_data import chat_room_created
from frappe.share import add
from tag_workflow.utils.notification import sendmail, make_system_notification
from tag_workflow.tag_data import joborder_email_template
class ClaimOrder(Document):
	pass

jobOrder = 'Job Order'
claimOrder = "Claim Order"

@frappe.whitelist()
def staffing_claim_joborder(job_order,hiring_org, staffing_org, doc_name):
	try:
		print('staffing calim function is called',job_order,staffing_org,doc_name,hiring_org)
		bid_receive=frappe.get_doc(jobOrder,job_order)

		bid_receive.bid=1+int(bid_receive.bid)

		if(bid_receive.claim is None):
			bid_receive.claim=staffing_org
			chat_room_created(hiring_org,staffing_org,job_order)

		else:
			if(staffing_org not in bid_receive.claim):
				bid_receive.claim=str(bid_receive.claim)+str(",")+staffing_org
				chat_room_created(hiring_org,staffing_org,job_order)

		bid_receive.save(ignore_permissions=True)

		job_sql = '''select select_job,job_site,posting_date_time from `tabJob Order` where name = "{}"'''.format(job_order)
		job_detail = frappe.db.sql(job_sql, as_dict=1)

		lst_sql = ''' select user_id from `tabEmployee` where company = "{}" and user_id IS NOT NULL '''.format(hiring_org)
		user_list = frappe.db.sql(lst_sql, as_list=1)

		l = [l[0] for l in user_list]
		for user in l:
			add(claimOrder, doc_name, user, read=1, write = 0, share = 0, everyone = 0,flags={"ignore_share_permission": 1})

		sub="Claim Order"
		msg = f'{staffing_org} has submitted a claim for {job_detail[0]["select_job"]} at {job_detail[0]["job_site"]} on {job_detail[0]["posting_date_time"]}'
		make_system_notification(l,msg,claimOrder,doc_name,sub)
		msg = f'{staffing_org} has submitted a claim for {job_detail[0]["select_job"]} at {job_detail[0]["job_site"]} on {job_detail[0]["posting_date_time"]}. Please review and/or approve this claim .'
		link =  f'  href="/app/claim-order/{doc_name}" '
		return joborder_email_template(sub,msg,l,link)

	except Exception as e:
		print(e, frappe.get_traceback())
		frappe.db.rollback()
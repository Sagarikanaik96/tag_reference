# Copyright (c) 2022, SourceFuse and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from tag_workflow.tag_data import chat_room_created
from frappe.share import add
from tag_workflow.utils.notification import sendmail, make_system_notification
from tag_workflow.tag_data import joborder_email_template
import json

from tenacity import retry
class ClaimOrder(Document):
	pass

jobOrder = 'Job Order'
claimOrder = "Claim Order"

@frappe.whitelist()
def staffing_claim_joborder(job_order,hiring_org, staffing_org, doc_name,single_share,no_required,no_assigned):
	try:
		if(int(single_share)==1):
			check_partial_claim(job_order,staffing_org,no_required,no_assigned,hiring_org,doc_name)
			return

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

		lst_sql = ''' select name from `tabUser` where company = "{}" '''.format(hiring_org)
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
		frappe.msgprint(e)
		print(e, frappe.get_traceback())
		frappe.db.rollback()


@frappe.whitelist()
def save_claims(my_data,doc_name):
	try:
		companies=[]
		my_data=json.loads(my_data)
		for key in my_data:
			companies.append(key)

		for i in companies:
			job = frappe.get_doc(jobOrder, doc_name)
			claimed = job.staff_org_claimed if job.staff_org_claimed else ""
			value1=""
			if(len(claimed)==0):
				value1 += (str(claimed)+str(i))
			elif(str(i) not in claimed):
				value1 += (str(claimed)+", "+str(i))
			sql=f'select name from `tabClaim Order` where job_order="{doc_name}" and staffing_organization="{i}"'
			claim_order_name=frappe.db.sql(sql,as_dict=1)
			doc=frappe.get_doc('Claim Order',claim_order_name[0].name)
			doc.approved_no_of_workers=my_data[i]
			doc.save(ignore_permissions=True)

			frappe.db.set_value(jobOrder, doc_name, "staff_org_claimed", value1)
			user_data = ''' select user_id from `tabEmployee` where company = "{}" and user_id IS NOT NULL '''.format(i)
			user_list = frappe.db.sql(user_data, as_list=1)
			l = [l[0] for l in user_list]
			sub="Approve Claim Order"
			msg = f"{doc.hiring_organization} has approved {my_data[i]} employees for {doc_name} - {job.select_job}. Don't forget to assign employees to this order."
			make_system_notification(l,msg,claimOrder,doc.name,sub)
			link =  f'  href="/app/claim-order/{doc.name}" '
			joborder_email_template(sub,msg,l,link)
	except Exception as e:
		print(e, frappe.get_traceback())
		frappe.db.rollback()



@frappe.whitelist()
def order_details(doc_name):
	try:
		datas=''' select staffing_organization,no_of_workers_joborder,staff_claims_no from `tabClaim Order` where job_order = "{}"  '''.format(doc_name)
		return frappe.db.sql(datas,as_dict=True)
	except Exception as e:
		print(e, frappe.get_traceback())
		frappe.db.rollback()

@frappe.whitelist()
def modify_heads(doc_name):
	try:
		claim_data=f''' select staffing_organization,no_of_workers_joborder,staff_claims_no,approved_no_of_workers from `tabClaim Order` where job_order="{doc_name}" and staffing_organization not in (select company from `tabAssign Employee` where job_order="{doc_name}" and tag_status="Approved")'''
		claims=frappe.db.sql(claim_data,as_dict=True)
		return claims
	except Exception as e:
		print(e,frappe.get_traceback())
		frappe.db.rollback()

@frappe.whitelist()
def save_modified_claims(my_data,doc_name):
	try:
		companies=[]
		my_data=json.loads(my_data)
		for key in my_data:
			companies.append(key)

		for i in companies:
			job = frappe.get_doc(jobOrder, doc_name)
			claimed = job.staff_org_claimed if job.staff_org_claimed else ""
			if(len(claimed)==0):
				frappe.db.set_value(jobOrder, doc_name, "staff_org_claimed", (str(claimed)+str(i)))
			elif(str(i) not in claimed):
				frappe.db.set_value(jobOrder, doc_name, "staff_org_claimed", (str(claimed)+", "+str(i)))

			sql=f'select name from `tabClaim Order` where job_order="{doc_name}" and staffing_organization="{i}"'
			claim_order_name=frappe.db.sql(sql,as_dict=1)
			doc=frappe.get_doc('Claim Order',claim_order_name[0].name)
			msg = f"{doc.hiring_organization} has update the approved no. of employees needed for {doc_name} - {job.select_job} from {doc.approved_no_of_workers} to {my_data[i]}"
			doc.approved_no_of_workers=my_data[i]
			doc.save(ignore_permissions=True)

			user_data = ''' select user_id from `tabEmployee` where company = "{}" and user_id IS NOT NULL '''.format(i)
			user_list = frappe.db.sql(user_data, as_list=1)
			l = [l[0] for l in user_list]
			sub="Approve Claim Order"
			make_system_notification(l,msg,claimOrder,doc.name,sub)
			link =  f'  href="/app/claim-order/{doc.name}" '
			joborder_email_template(sub,msg,l,link)
		return "success"
	except Exception as e:
		print(e, frappe.get_traceback())
		frappe.db.rollback()


def check_partial_claim(job_order,staffing_org,no_required,no_assigned,hiring_org,doc_name):
	try:
		job_order_data=frappe.get_doc(jobOrder,job_order)
		if no_assigned< no_required:
			job_order_data.is_single_share = '0'
		job_order_data.bid=1+int(job_order_data.bid)
		if(job_order_data.claim is None):
			job_order_data.claim=staffing_org
			chat_room_created(hiring_org,staffing_org,job_order)

		else:
			if(staffing_org not in job_order_data.claim):
				job_order_data.claim=str(job_order_data.claim)+str(",")+staffing_org
				chat_room_created(hiring_org,staffing_org,job_order)

		job_order_data.save(ignore_permissions=True)

		sql1 = '''select email from `tabUser` where organization_type='hiring' and company = "{}"'''.format(hiring_org)
		hiring_list = frappe.db.sql(sql1,as_list=True)
		hiring_user_list = [user[0] for user in hiring_list]

		if int(no_required) > int(no_assigned):
			sql = '''select email from `tabUser` where organization_type='staffing' and company != "{}"'''.format(staffing_org)
			share_list = frappe.db.sql(sql, as_list = True)
			assign_notification(share_list,hiring_user_list,doc_name,job_order)
			subject = 'Job Order Notification'
			msg=f'{staffing_org} placed partial claim on your work order: {job_order_data.select_job}. Please review.'
			make_system_notification(hiring_user_list,msg,claimOrder,doc_name,subject)
			link =  f'  href="/app/claim-order/{doc_name}" '
			joborder_email_template(subject,msg,hiring_user_list,link)
		else:
			if hiring_user_list:
				subject = 'Job Order Notification'
				for user in hiring_user_list:
					add(claimOrder, doc_name, user, read=1, write = 0, share = 0, everyone = 0,flags={"ignore_share_permission": 1})

				msg=f'{staffing_org} placed Full claim on your work order: {job_order_data.select_job}. Please review.'
				make_system_notification(hiring_user_list,msg,claimOrder,doc_name,subject)
				link =  f'  href="/app/claim-order/{doc_name}" '
				joborder_email_template(subject,msg,hiring_user_list,link)
	except Exception as e:
		frappe.log_error(e, "Partial Job order Failed ")
def assign_notification(share_list,hiring_user_list,doc_name,job_order):
	if share_list:
		for user in share_list:
			add(jobOrder, job_order, user[0], read=1,write=0, share=1, everyone=0, notify=0,flags={"ignore_share_permission": 1})
	for user in hiring_user_list:
		add(claimOrder, doc_name, user, read=1, write = 0, share = 0, everyone = 0,flags={"ignore_share_permission": 1})


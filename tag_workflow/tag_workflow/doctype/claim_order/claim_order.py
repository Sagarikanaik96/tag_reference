# Copyright (c) 2022, SourceFuse and contributors
# For license information, please see license.txt


import frappe
from frappe.model.document import Document
from tag_workflow.tag_data import chat_room_created
from frappe.share import add
from tag_workflow.utils.notification import sendmail, make_system_notification
from tag_workflow.tag_data import joborder_email_template
import json

site= frappe.utils.get_url().split('/')
sitename=site[0]+'//'+site[2]

class ClaimOrder(Document):
	pass

jobOrder = 'Job Order'
claimOrder = "Claim Order"
EPR = 'Employee Pay Rate'
AssignEmp= 'Assign Employee'
SCC="Staffing Comp Code"

@frappe.whitelist()
def staffing_claim_joborder(job_order,hiring_org, staffing_org, doc_name,single_share,no_required,no_assigned):
	try:
		if(int(single_share)==1):
			check_partial_claim(job_order,staffing_org,no_required,no_assigned,hiring_org,doc_name)
			return

		bid_receive=frappe.get_doc(jobOrder,job_order)

		if(bid_receive.claim is None):
			bid_receive.bid=1+int(bid_receive.bid)
			bid_receive.claim=staffing_org
			chat_room_created(hiring_org,staffing_org,job_order)

		else:
			if(staffing_org not in bid_receive.claim):
				bid_receive.bid=1+int(bid_receive.bid)
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
		link =  f'  href="{sitename}/app/claim-order/{doc_name}" '
		joborder_email_template(sub,msg,l,link)
		return 1

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
			doc=frappe.get_doc(claimOrder,claim_order_name[0].name)
			doc.approved_no_of_workers=my_data[i]['approve_count']
			doc.notes = my_data[i]['notes']
			doc.save(ignore_permissions=True)

			frappe.db.set_value(jobOrder, doc_name, "staff_org_claimed", value1)
			user_data = ''' select user_id from `tabEmployee` where company = "{}" and user_id IS NOT NULL '''.format(i)
			user_list = frappe.db.sql(user_data, as_list=1)
			l = [l[0] for l in user_list]
			sub="Approve Claim Order"
			msg = f"{doc.hiring_organization} has approved {my_data[i]['approve_count']} employees for {doc_name} - {job.select_job}. Don't forget to assign employees to this order."
			make_system_notification(l,msg,claimOrder,doc.name,sub)
			link =  f'  href="{sitename}/app/claim-order/{doc.name}" '
			joborder_email_template(sub,msg,l,link)
		return 1
	except Exception as e:
		print(e, frappe.get_traceback())
		frappe.db.rollback()



@frappe.whitelist()
def order_details(doc_name):
	try:
		datas=''' select name,staffing_organization,no_of_workers_joborder,staff_claims_no from `tabClaim Order` where job_order = "{}"  '''.format(doc_name)
		return frappe.db.sql(datas,as_dict=True)
	except Exception as e:
		print(e, frappe.get_traceback())
		frappe.db.rollback()

@frappe.whitelist()
def remaining_emp(doc_name):
	try:
		datas=''' select sum(approved_no_of_workers) as approved_no_of_workers  from `tabClaim Order` where job_order = "{}"  '''.format(doc_name)
		data=frappe.db.sql(datas,as_dict=True)
		if(len(data)):
			approved_claims=data[0]['approved_no_of_workers']
		else:
			approved_claims=0
		job_order=frappe.get_doc(jobOrder,doc_name)
		worker_required=job_order.no_of_workers
		return int(approved_claims),worker_required
	except Exception as e:
		print(e, frappe.get_traceback())
		frappe.db.rollback()

@frappe.whitelist()
def modify_heads(doc_name):
	try:
		redis = frappe.cache()
		key = doc_name
		job= frappe.get_doc(jobOrder, doc_name)
		claim_data = None
		if job.worker_filled== 0:
			claim_data= """ select name,staffing_organization,no_of_workers_joborder,staff_claims_no,approved_no_of_workers,notes from `tabClaim Order` where job_order="{0}" and staffing_organization not in (select company from `tabAssign Employee` where job_order="{0}" and tag_status="Approved") """.format(doc_name)
		else:
			claim_data= """
			select name,staffing_organization,no_of_workers_joborder,staff_claims_no,approved_no_of_workers,notes from `tabClaim Order` where job_order="{0}" and approved_no_of_workers >=0 and staffing_organization in (select company from `tabAssign Employee` where job_order='{0}' and tag_status='Approved')
			UNION
			select name,staffing_organization,no_of_workers_joborder,staff_claims_no,approved_no_of_workers,notes from `tabClaim Order` where job_order="{0}" and approved_no_of_workers >=0 and staffing_organization  not in (select company from `tabAssign Employee` where job_order='{0}' and tag_status='Approved')
			""".format(doc_name)
		claims=frappe.db.sql(claim_data,as_dict=True)
		exists = []
		print(claims)
		for c in claims:
			assigned_worker= frappe.db.get_value(AssignEmp,{'job_order':doc_name,'tag_status':'Approved','company':c['staffing_organization']},['previous_worker'])
			if (assigned_worker is not None and c['staffing_organization'] in exists and redis.hget(key,c['name']) is not None  and int(redis.hget(key,c['name']))!=1) :
				hide_and_show(c,doc_name,assigned_worker)
			elif (assigned_worker is not None and assigned_worker<c['approved_no_of_workers']) or c['approved_no_of_workers']==0:
				c['hide'] =0
				c['assigned_worker'] = assigned_worker
			elif assigned_worker is not None and assigned_worker>=c['approved_no_of_workers']:
				c['hide'] = 1
			else:
				c['hide'] = 0
		
			exists.append(c['staffing_organization'])
			redis.hset(key,c['name'],c['hide'])
			
		print(claims)
		return claims
	except Exception as e:
		print(e,frappe.get_traceback())
		frappe.db.rollback()

@frappe.whitelist()
def save_modified_claims(my_data,doc_name,notes_dict):
	try:
		claims_id=[]
		my_data=json.loads(my_data)
		for key in my_data:
			claims_id.append(key)
		if claims_id:
			for i in claims_id:
				if type(my_data[i]['approve_count'])== int:
					job = frappe.get_doc(jobOrder, doc_name)
					claimed = job.staff_org_claimed if job.staff_org_claimed else ""
					doc=frappe.get_doc(claimOrder,i)
					claim_comp_assigned(claimed,doc_name,doc)
					msg = f"{doc.hiring_organization} has update the approved no. of employees needed for {doc_name} - {job.select_job} from {doc.approved_no_of_workers} to {my_data[i]['approve_count']}"
					
					doc.approved_no_of_workers=my_data[i]["approve_count"]
					doc.save(ignore_permissions=True)
					user_data = ''' select user_id from `tabEmployee` where company = "{}" and user_id IS NOT NULL '''.format(doc.staffing_organization)
					user_list = frappe.db.sql(user_data, as_list=1)
					l = [l[0] for l in user_list]
					sub="Approve Claim Order"
					make_system_notification(l,msg,claimOrder,doc.name,sub)
					link =  f'  href="{sitename}/app/claim-order/{doc.name}" '
					joborder_email_template(sub,msg,l,link)
			update_notes(notes_dict,doc_name)
			return 1
	except Exception as e:
		print(e, frappe.get_traceback())
		frappe.db.rollback()


def check_partial_claim(job_order,staffing_org,no_required,no_assigned,hiring_org,doc_name):
	try:
		job_order_data=frappe.get_doc(jobOrder,job_order)
		is_single_share = 1
		if int(no_assigned)< int(no_required):
			is_single_share = 0
		bid=1+int(job_order_data.bid)
		claimed = job_order_data.claim if job_order_data.claim else ""
		value1=""
		if(len(claimed)==0):
			value1 += str(staffing_org)
			chat_room_created(hiring_org,staffing_org,job_order)

		elif(staffing_org not in claimed):
			value1 += (str(claimed)+", "+str(staffing_org))
			chat_room_created(hiring_org,staffing_org,job_order)
		else:
			value1 += str(claimed)
			chat_room_created(hiring_org,staffing_org,job_order)

		frappe.db.sql('update `tabJob Order` set claim="{0}",bid="{1}",is_single_share={3} where name="{2}"'.format(value1,bid,job_order,is_single_share))
		frappe.db.commit()


		sql1 = '''select email from `tabUser` where organization_type='hiring' and company = "{}"'''.format(hiring_org)
		hiring_list = frappe.db.sql(sql1,as_list=True)
		hiring_user_list = [user[0] for user in hiring_list]
		if int(no_required) > int(no_assigned):
			sql = '''select email from `tabUser` where organization_type='staffing' and company != "{}"'''.format(staffing_org)
			share_list = frappe.db.sql(sql, as_list = True)
			staffing_user_list = [user[0] for user in share_list]
			assign_notification(share_list,hiring_user_list,doc_name,job_order)
			subject = 'Job Order Notification'
			msg=f'{staffing_org} placed partial claim on your work order: {job_order_data.select_job}. Please review.'
			make_system_notification(hiring_user_list,msg,claimOrder,doc_name,subject)
			link =  f'  href="{sitename}/app/claim-order/{doc_name}" '
			joborder_email_template(subject,msg,hiring_user_list,link)
			staff_email_sending_without_resume(job_order, no_required, no_assigned, hiring_org, job_order_data, staffing_user_list, subject)
			return 1
		else:
			if hiring_user_list:
				subject = 'Job Order Notification'
				for user in hiring_user_list:
					add(claimOrder, doc_name, user, read=1, write = 0, share = 0, everyone = 0,flags={"ignore_share_permission": 1})

				msg=f'{staffing_org} placed Full claim on your work order: {job_order_data.select_job}. Please review.'
				make_system_notification(hiring_user_list,msg,claimOrder,doc_name,subject)
				link =  f'  href="{sitename}/app/claim-order/{doc_name}" '
				joborder_email_template(subject,msg,hiring_user_list,link)
				return 1
	except Exception as e:
		frappe.log_error(e, "Partial Job order Failed ")

def staff_email_sending_without_resume(job_order, no_required, no_assigned, hiring_org, job_order_data, staffing_user_list, subject):
    query = '''select sum(approved_no_of_workers) from `tabClaim Order` where job_order = "{}" '''.format(job_order)
    rem_emp = frappe.db.sql(query)
    notification_func(job_order, no_required, no_assigned, hiring_org, job_order_data, staffing_user_list, subject, rem_emp)

def notification_func(job_order, no_required, no_assigned, hiring_org, job_order_data, staffing_user_list, subject, rem_emp):
	if rem_emp[0][0] and job_order_data.is_repeat:
		count = int(no_required) - int(rem_emp[0][0])
	else:
		count = int(no_required)-int(no_assigned)
	if count>0:
		if count==1:
			newmsg = f'{hiring_org} has an order for {job_order_data.select_job} available with {count} opening available.'
		else:
			newmsg = f'{hiring_org} has an order for {job_order_data.select_job} available with {count} openings available.'
		make_system_notification(staffing_user_list, newmsg, jobOrder, job_order, subject)
		link_job_order = f'  href="{sitename}/app/job-order/{job_order}"'
		joborder_email_template(subject, newmsg, staffing_user_list, link_job_order,sender_full_name = job_order_data.company,sender = job_order_data.owner)

	
def assign_notification(share_list,hiring_user_list,doc_name,job_order):
	if share_list:
		for user in share_list:
			add(jobOrder, job_order, user[0], read=1,write=0, share=1, everyone=0, notify=0,flags={"ignore_share_permission": 1})
	for user in hiring_user_list:
		add(claimOrder, doc_name, user, read=1, write = 0, share = 0, everyone = 0,flags={"ignore_share_permission": 1})


def claim_comp_assigned(claimed,doc_name,doc):
	if(len(claimed)==0):
		frappe.db.set_value(jobOrder, doc_name, "staff_org_claimed", (str(claimed)+str(doc.staffing_organization)))
	elif(str(doc.staffing_organization) not in claimed):
		frappe.db.set_value(jobOrder, doc_name, "staff_org_claimed", (str(claimed)+", "+str(doc.staffing_organization)))

@frappe.whitelist()
def claim_field_readonly(docname):
	try:
		sql = '''select owner from tabVersion where docname = "{0}"'''.format(docname)
		data = frappe.db.sql(sql, as_dict=1)
		if data:
			new_data = list(set([d['owner'] for d in data]))
			for i in new_data:
				user_type = frappe.db.get_value('User', {"name": i}, ['organization_type'])
				if user_type == 'Hiring':
					return 'headcount_selected'

		return 'headcount_not_selected'
	except Exception as e:
		frappe.log_error(e, 'Claim Field Read Only Error')
		print(e, frappe.get_traceback())

@frappe.whitelist()
def set_pay_rate(hiring_company, job_title, job_site, staffing_company):
	try:
		emp_pay_rate = frappe.db.exists(EPR, {"hiring_company": hiring_company,"job_title": job_title, "job_site": job_site, "staffing_company": staffing_company})
		if emp_pay_rate:
			return frappe.db.get_value(EPR, {"name": emp_pay_rate}, ['employee_pay_rate'])
	except Exception as e:
		frappe.log_error(e, 'Set Pay Rate Error')
		print(e, frappe.get_traceback())

@frappe.whitelist()
def payrate_change(docname):
	try:
		sql = '''select data from `tabVersion` where docname="{0}" order by modified DESC'''.format(docname)
		data = frappe.db.sql(sql, as_list=1)
		new_data = json.loads(data[0][0]) if data else []
		if 'changed' not in new_data:
			return 'success'
		else:
			for i in new_data['changed']:
				if i[0] == 'staff_claims_no':
					return 'success'
		return 'failure'
	except Exception as e:
		frappe.log_error(e, 'Pay Rate Change Error')
		print(e, frappe.get_traceback())

@frappe.whitelist()
def create_pay_rate(hiring_company, job_title, job_site, employee_pay_rate, staffing_company):
	try:
		emp_pay_rate = frappe.db.exists(EPR, {"hiring_company": hiring_company,"job_title": job_title, "job_site": job_site, "staffing_company": staffing_company})
		if emp_pay_rate:
			pay_rate = frappe.db.get_value(EPR, {"name": emp_pay_rate}, ['employee_pay_rate'])
			if pay_rate != employee_pay_rate:
				frappe.db.set_value(EPR, emp_pay_rate,"employee_pay_rate", employee_pay_rate)

		else:
			doc = frappe.new_doc(EPR)
			doc.hiring_company = hiring_company
			doc.job_title = job_title
			doc.job_site = job_site
			doc.employee_pay_rate = employee_pay_rate
			doc.staffing_company = staffing_company
			doc.insert()
	except Exception as e:
		frappe.log_error(e, 'Set Pay Rate Error')
		print(e, frappe.get_traceback())

@frappe.whitelist()
def auto_claims_approves(my_data,doc_name,doc_claim):
	try:
		companies=[]
		my_data=json.loads(my_data)
		for key in my_data:
			companies.append(key)
		for i in companies:
			job = frappe.get_doc(jobOrder, doc_name)
			claims=job.claim if job.claim else ""
			claimed = job.staff_org_claimed if job.staff_org_claimed else ""
			value1=""
			if(len(claimed)==0):
				value1 += (str(claimed)+str(i))
			elif(str(i) not in claimed):
				value1 += (str(claimed)+", "+str(i))
			else:
				value1 += str(claimed)
			value2=""
			if(len(claims)==0):
				value2 += (str(claims)+str(i))
			elif(str(i) not in claims):
				value2 += (str(claims)+", "+str(i))
			else:
				value2 += str(claims)
			doc=frappe.get_doc(claimOrder,doc_claim)
			doc.approved_no_of_workers=my_data[i]
			doc.save(ignore_permissions=True)
			frappe.db.sql('update `tabJob Order` set staff_org_claimed="{0}",claim="{2}" where name="{1}"'.format(value1,doc_name,value2))
			frappe.db.commit()
			user_data = ''' select user_id from `tabEmployee` where user_id IS NOT NULL and company = "{}" '''.format(i)
			user_list = frappe.db.sql(user_data, as_list=1)
			l = [l[0] for l in user_list]
			sub="Approve Claim Orders"
			msg = f"{doc.hiring_organization} has approved {my_data[i]} employees for {doc_name} - {job.select_job}. Don't forget to assign employees to this order."
			make_system_notification(l,msg,claimOrder,doc.name,sub)
			link =  f'  href="{sitename}/app/claim-order/{doc.name}" '
			joborder_email_template(sub,msg,l,link)
		return 1
	except Exception as e:
		print(e, frappe.get_traceback())
		frappe.db.rollback()

@frappe.whitelist()
def update_notes(data,doc_name):
	try:
		data= json.loads(data)
		for k,v in data.items():
			notes,org = frappe.db.get_value(claimOrder,{'name':k},['notes','staffing_organization'])
			if str(notes).strip() == str(v).strip():
				continue
			frappe.db.set_value(claimOrder,k,'notes',v)
	except Exception as e:
		print(e,frappe.utils.get_traceback())


def hide_and_show(c,doc_name,assigned_worker):
	try:
		total_approved = frappe.db.get_list(claimOrder,filters={'staffing_organization':c['staffing_organization'],'job_order':doc_name},fields=['SUM(approved_no_of_workers) as total_approved'])[0]['total_approved'] or 0
		if (assigned_worker is not None and assigned_worker<total_approved) or c['approved_no_of_workers']==0:
			c['hide'] =0
			c['assigned_worker'] = assigned_worker
		elif assigned_worker is not None and assigned_worker>=total_approved:
			c['hide'] = 1
	except Exception as e:
		print(e,frappe.utils.get_traceback())


@frappe.whitelist()
def create_staff_comp_code(job_title,job_site,industry_type, staff_class_code, staffing_company,staff_class_code_rate):
	try:
		if(len(staff_class_code)>0):
			job_titlename=job_title_value(job_title)
			state=frappe.db.get_value('Job Site',job_site,['state'])
			check_industry_vals=frappe.db.sql('select name from `tabStaffing Comp Code` where job_industry="{0}" and staffing_company="{1}" and job_title like "{2}%" '.format(industry_type,staffing_company,job_titlename),as_dict=1)
			if(len(check_industry_vals)>0):
				check_staff_comp_code_existence(state,staff_class_code_rate,staff_class_code,industry_type,staffing_company,job_titlename,check_industry_vals)
			else:
				doc = frappe.get_doc({
					'doctype':SCC,
					'job_industry':industry_type,
					'job_title':job_titlename,
					'staffing_company':staffing_company,
					'class_codes':[{
						'class_code':staff_class_code,
						'rate':staff_class_code_rate,
						'state':state
					}]
				})
				meta = frappe.get_meta(SCC)
				for field in meta.get_link_fields():
					field.ignore_user_permissions = 1
				doc.flags.ignore_permissions = True
				doc.insert()
	except Exception as e:
		frappe.log_error(e, 'Set Class Code Error')
		print(e, frappe.get_traceback())
def job_title_value(job_title):
	job_title_name=job_title.split('-')
	if(len(job_title_name)==1):
		job_titlename=job_title
	else:
		job_names=job_title_name[-1]
		if((job_names).isnumeric()):
			last_occurence=job_title.rfind("-")
			job_titlename=job_title[0:last_occurence]
		else:
			job_titlename=job_title
	return job_titlename
@frappe.whitelist()
def check_already_exist_class_code(job_order,staffing_company):
	try:
		job_title,job_site,industry_type=frappe.db.get_value(jobOrder,job_order,['select_job', 'job_site','category'])
		job_titlename=job_title_value(job_title)
		state=frappe.db.get_value('Job Site',job_site,['state'])
		comp_code=frappe.db.sql('select SCC.name from `tabStaffing Comp Code` as SCC inner join `tabClass Code` as CC on SCC.name=CC.parent where job_industry="{0}" and CC.state="{1}" and staffing_company="{2}" and job_title like "{3}%"'.format(industry_type,state,staffing_company,job_titlename),as_dict=1)
		if len(comp_code)>0:
			data=frappe.db.sql(''' select class_code,rate from `tabClass Code` where parent="{0}" and state="{1}" '''.format(comp_code[0].name,state),as_dict=1)
			class_code=data[0].class_code
			rate=data[0].rate
			return class_code,rate
		else:
			return ['Exist']
	except Exception as e:
		frappe.log_error(e, 'Set Class Code Error')
		print(e, frappe.get_traceback())
def check_staff_comp_code_existence(state,staff_class_code_rate,staff_class_code,industry_type,staffing_company,job_titlename,check_industry_vals):
	comp_code=frappe.db.sql('select SCC.name from `tabStaffing Comp Code` as SCC inner join `tabClass Code` as CC on SCC.name=CC.parent where job_industry="{0}" and CC.state="{1}" and staffing_company="{2}" and job_title like "{3}%" '.format(industry_type,state,staffing_company,job_titlename),as_dict=1)
	if len(comp_code)>0:
		data=frappe.db.sql(''' select class_code,rate from `tabClass Code` where parent="{0}" and state="{1}" '''.format(comp_code[0].name,state),as_dict=1)
		class_code=data[0].class_code
		code_rate=data[0].rate
		if code_rate != staff_class_code_rate or class_code!=staff_class_code:
			frappe.db.sql('''update `tabClass Code` set class_code="{0}", rate="{1}" where parent="{2}" and state="{3}"'''.format(staff_class_code,staff_class_code_rate,comp_code[0].name,state))
			frappe.db.commit()
	else:
		doc=frappe.get_doc(SCC,check_industry_vals[0].name)
		adding_values(doc,staff_class_code,staff_class_code_rate,state)

def adding_values(doc,staff_class_code,staff_class_code_rate,state):
    doc.append('class_codes',{'class_code':staff_class_code,'rate':staff_class_code_rate,'state':state})
    doc.save(ignore_permissions = True)	
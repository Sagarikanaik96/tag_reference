# Copyright (c) 2013, SourceFuse and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import data
import datetime
job_id = 'Job ID'
job_title = 'Job Title'
jobOrder = 'Job Order'
date_time = 'Date & Time'
no_of_workers = 'No Of Workers'
staffing_company = 'Staffing Company'
bids_received = 'Bids Received'
claimed_by = 'Claimed By'

def execute(filters=None):
    if not filters:
        filters={}
    columns,data=[],[]
    today = datetime.datetime.now()
    user_name=frappe.session.user
    sql = ''' select organization_type from `tabUser` where email='{}' '''.format(user_name)
    user_type=frappe.db.sql(sql, as_list=1)
    if frappe.session.user=="Administrator" or user_type[0][0]=='TAG':
        if filters.get('status')==None:
            columns=[
                {'fieldname':'name','label':(job_id),'fieldtype':'Link','options':jobOrder,'width':150},
                {'fieldname':'select_job','label':(job_title),'fieldtype':'Data','width':150},
                {'fieldname':'from_date','label':(date_time),'fieldtype':'Data','width':150},
                {'fieldname':'job_site','label':('Location'),'fieldtype':'Data','width':150},
                {'fieldname':'no_of_workers','label':(no_of_workers),'fieldtype':'Int','width':150},
                {'fieldname':'bid','label':(bids_received),'fieldtype':'Int','width':150},
                {'fieldname':'claim','label':(claimed_by),'fieldtype':'Data','width':150},
                {'fieldname':'staff_org_claimed','label':(staffing_company),'fieldtype':'Data','width':150},
                ]
            sql = ''' select name, select_job, from_date,job_site,no_of_workers,bid,claim,staff_org_claimed from `tabJob Order` '''
            data=frappe.db.sql(sql)
        elif filters.get('status')=='Completed':
            columns=[
                {'fieldname':'name','label':(job_id),'fieldtype':'Link','options':jobOrder,'width':200},
                {'fieldname':'select_job','label':(job_title),'fieldtype':'Data','width':150},
                {'fieldname':'from_date','label':(date_time),'fieldtype':'Data','width':200},
                {'fieldname':'job_site','label':('Location'),'fieldtype':'Data' ,'width':200},
                {'fieldname':'no_of_workers','label':(no_of_workers),'fieldtype':'Int','width':200},
                {'fieldname':'staff_org_claimed','label':(staffing_company),'fieldtype':'Data','width':200}             
                ]
            sql = ''' select name,select_job,from_date,job_site,no_of_workers,staff_org_claimed from `tabJob Order` where to_date<'{0}' '''.format(today)
            data=frappe.db.sql(sql)
        elif filters.get('status')=='Ongoing':
            columns=[
                {'fieldname':'name','label':(job_id),'fieldtype':'Link','options':jobOrder,'width':200},
                {'fieldname':'select_job','label':(job_title),'fieldtype':'Data','width':150},
                {'fieldname':'from_date','label':(date_time),'fieldtype':'Data','width':200},
                {'fieldname':'job_site','label':('Location'),'fieldtype':'Data' ,'width':200},
                {'fieldname':'no_of_workers','label':(no_of_workers),'fieldtype':'Int','width':200},
                {'fieldname':'staff_org_claimed','label':(staffing_company),'fieldtype':'Data','width':200}
                ]
            sql = ''' select name,select_job,from_date,job_site,no_of_workers,staff_org_claimed from `tabJob Order` where from_date<'{0}' and to_date>'{0}' '''.format(today)
            data=frappe.db.sql(sql)

    
        elif filters.get('status')=='Upcoming':
            columns=[
                {'fieldname':'name','label':(job_id),'fieldtype':'Link','options':jobOrder,'width':200},
                {'fieldname':'select_job','label':(job_title),'fieldtype':'Data','width':150},
                {'fieldname':'from_date','label':(date_time),'fieldtype':'Data','width':200},
                {'fieldname':'job_site','label':('Location'),'fieldtype':'Data','width':200},
                {'fieldname':'bid','label':(bids_received),'fieldtype':'Int','width':200},
                {'fieldname':'claim','label':(claimed_by),'fieldtype':'Data','width':200},
                ]
            sql = ''' select name,select_job,from_date,job_site,bid,claim from `tabJob Order` where from_date>'{0}' '''.format(today)
            data=frappe.db.sql(sql)
    else:
        if filters.get('status')==None:

            columns=[
                {'fieldname':'name','label':(job_id),'fieldtype':'Link','options':jobOrder,'width':150},
                {'fieldname':'select_job','label':(job_title),'fieldtype':'Data','width':150},
                {'fieldname':'from_date','label':(date_time),'fieldtype':'Data','width':150},
                {'fieldname':'job_site','label':('Location'),'fieldtype':'Data','width':150},
                {'fieldname':'no_of_workers','label':(no_of_workers),'fieldtype':'Int','width':150},
                {'fieldname':'bid','label':(bids_received),'fieldtype':'Int','width':150},
                {'fieldname':'claim','label':(claimed_by),'fieldtype':'Data','width':150},
                {'fieldname':'staff_org_claimed','label':(staffing_company),'fieldtype':'Data','width':150}
                ]
            sql = ''' select name,select_job,from_date,job_site,no_of_workers,bid,claim,staff_org_claimed from `tabJob Order` where company in (select company from `tabEmployee` where email ="{0}") '''.format(user_name)
            data=frappe.db.sql(sql)
        elif filters.get('status')=='Completed':
            columns=[
                {'fieldname':'name','label':(job_id),'fieldtype':'Link','options':jobOrder,'width':200},
                {'fieldname':'select_job','label':(job_title),'fieldtype':'Data','width':150},
                {'fieldname':'from_date','label':(date_time),'fieldtype':'Data','width':200},
                {'fieldname':'job_site','label':('Location'),'fieldtype':'Data' ,'width':200},
                {'fieldname':'no_of_workers','label':(no_of_workers),'fieldtype':'Int','width':200},
                {'fieldname':'staff_org_claimed','label':(staffing_company),'fieldtype':'Data','width':200},
                {'fieldname': 'view', 'label':('View'),'width': 60}, 
                {'fieldname': 'repeat', 'label':('Repeat'),'width': 75}    
                ]
            sql = ''' select name,select_job,from_date,job_site,no_of_workers,staff_org_claimed, concat ('<button type="button" class="btn-primary" onClick="view_joborder(\''', `tabJob Order`.name ,\''')">View</button>'), concat('<button type="button" class="btn-primary"  onClick="repeat_joborder(\''', `tabJob Order`.name ,\''')">Repeat</button>') from `tabJob Order`  where to_date<'{0}'  AND company in (select company from `tabEmployee` where email ="{1}") '''.format(today,user_name)
            data=frappe.db.sql(sql)
        elif filters.get('status')=='Ongoing':
            columns=[
                {'fieldname':'name','label':(job_id),'fieldtype':'Link','options':jobOrder,'width':200},
                {'fieldname':'select_job','label':(job_title),'fieldtype':'Data','width':150},
                {'fieldname':'from_date','label':(date_time),'fieldtype':'Data','width':200},
                {'fieldname':'job_site','label':('Location'),'fieldtype':'Data' ,'width':200       },
                {'fieldname':'no_of_workers','label':(no_of_workers),'fieldtype':'Int','width':200},
                {'fieldname':'staff_org_claimed','label':(staffing_company),'fieldtype':'Data','width':200}
                ]
            sql = ''' select name,select_job,from_date,job_site,no_of_workers,staff_org_claimed from `tabJob Order` where from_date<'{0}' and to_date>'{0}' AND company in (select company from `tabEmployee` where email ="{1}") '''.format(today,user_name)
            data=frappe.db.sql(sql)

    
        elif filters.get('status')=='Upcoming':
            columns=[
                {'fieldname':'name','label':(job_id),'fieldtype':'Link','options':jobOrder,'width':200},
                {'fieldname':'select_job','label':(job_title),'fieldtype':'Data','width':150},
                {'fieldname':'from_date','label':(date_time),'fieldtype':'Data','width':200},
                {'fieldname':'job_site','label':('Location'),'fieldtype':'Data','width':200},
                {'fieldname':'bid','label':(bids_received),'fieldtype':'Int','width':200},
                {'fieldname':'claim','label':(claimed_by),'fieldtype':'Data','width':200},
                {'fieldname': 'view', 'label':('View'),'width': 60}
                ]
            sql = ''' select name,select_job,from_date,job_site,bid,claim, concat ('<button type="button" class="btn-primary" onClick="view_joborder(\''', `tabJob Order`.name ,\''')">View</button>') from `tabJob Order` where from_date>'{0}'  AND company in (select company from `tabEmployee` where email ="{1}") '''.format(today,user_name)
            data=frappe.db.sql(sql)

    return columns,data
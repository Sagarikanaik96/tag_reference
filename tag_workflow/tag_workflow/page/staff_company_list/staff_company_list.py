from time import process_time
import frappe
import json
from haversine import haversine, Unit
from tag_workflow.utils.reportview import get_lat_lng,get_custom_location

# this file for TG-2607
@frappe.whitelist()
def comp(comp_id=None,company_name=None,filters=None,start=0,end=20):
    user_name = frappe.session.user
    try:
        if user_name == 'Administrator':
            sql = """select name, address, city, state, zip, average_rating from `tabCompany` where organization_type='Staffing'"""
            data = frappe.db.sql(sql, as_dict=True)
            if comp_id:
                data=frappe.db.sql(sql, as_list=True)
                company_name=data[int(comp_id)-1][0]
                return company_data(company_name)
        else:
            sql = ''' select organization_type from `tabUser` where email='{}' '''.format(user_name)
            user_type=frappe.db.sql(sql, as_list=1)
            if user_type[0][0]=='Hiring':
               data = hiring_data(filters,user_name,comp_id,start,end)

            elif(user_type[0][0]=='Exclusive Hiring'): 
                sql=""" select parent_staffing from `tabCompany` where name='{0}'  """.format(company_name)
                staff_comp_name = frappe.db.sql(sql, as_list=1)
                sql = """  select * from `tabCompany` where name='{0}' """.format(staff_comp_name[0][0])
                data = frappe.db.sql(sql, as_dict=True)
                if comp_id:
                    data=frappe.db.sql(sql, as_list=True)
                    company_name=data[int(comp_id)-1][0]
                    return company_data(company_name)

        return data
    except Exception as e:
        frappe.log_error(e, "Staffing Company Error")

def company_data(company_name):
    det_sql = """ select * from `tabCompany` where name="{}" """.format(company_name)
    company_detail = frappe.db.sql(det_sql,as_dict=True)

    ind_sql = """ select industry_type from `tabIndustry Types` where parent='{}'""".format(company_name)
    company_industry=frappe.db.sql(ind_sql, as_dict=True)

    mem_sql = """ select first_name,last_name from `tabUser` where company='{}' and enabled=1 """.format(company_name)
    team_member=frappe.db.sql(mem_sql, as_dict=True)

    rev_sql = """select `tabUser`.first_name,`tabUser`.last_name,rating,comments,LEFT(`tabCompany Review`.creation,10) as creation from `tabCompany Review`,`tabUser` where staffing_company='{}' and comments IS NOT NULL and `tabUser`.name=`tabCompany Review`.owner""".format(company_name)
    company_review_rating=frappe.db.sql(rev_sql, as_dict=True)

    return company_detail,company_industry,team_member,company_review_rating  

def check_blocked_staffing(user_name, data):
    sql ='''select staffing_company_name from `tabBlocked Staffing Company` where modified_by='{}' '''.format(user_name)
    blocked_staffing = frappe.db.sql(sql, as_dict=True)
    for d in data:
        for blocked in blocked_staffing:
            if blocked['staffing_company_name'] == d['name']:
                d.update({'is_blocked': True})
    return data

@frappe.whitelist()
def favourite_company(company_to_favourite,user_name):
    try:
        comp_doc=frappe.get_doc('Company',user_name)
        if len(comp_doc.favourite_staffing_company_list)!=0:
            companies = comp_doc.favourite_staffing_company_list
            if company_to_favourite in companies:
                return "True"           
        comp_doc.append('favourite_staffing_company_list',{'favourite_staffing_company':company_to_favourite})
        comp_doc.save(ignore_permissions = True)
        return "True"
    except Exception as e:
        frappe.log_error(e, "company checkig")
        return "False" 

@frappe.whitelist()
def sorted_favourite_companies(user_name):
    try:
        comp_doc=frappe.get_doc('Company',user_name)
        comp=[]
        for i in comp_doc.favourite_staffing_company_list:
            comp.append(i.favourite_staffing_company)
        comp.sort()
        print(comp)
        return comp          

    except Exception as e:
        frappe.log_error(e, "company sorting")
        frappe.msgprint("Company favourites checking")
        return "False"  


@frappe.whitelist()
def unfavourite_company(company_to_favourite,user_name):
    comp_doc=frappe.get_doc('Company',user_name)
    if len(comp_doc.favourite_staffing_company_list)!=0:
        for i in comp_doc.favourite_staffing_company_list:
            if i.favourite_staffing_company==company_to_favourite:
                remove_row = i
                comp_doc.remove(remove_row)
                comp_doc.save(ignore_permissions=True) 
        return "False"

@frappe.whitelist()
def checking_favourites_list(company_to_favourite,user_name):
   try:
        comp_doc=frappe.get_doc('Company',user_name)
        if len(comp_doc.favourite_staffing_company_list)!=0:
            for i in comp_doc.favourite_staffing_company_list:
                if i.favourite_staffing_company==company_to_favourite:
                    return "True"
        return "False"

   except Exception as e:
      frappe.log_error(e, "company checkig")
      frappe.msgprint("Company favourites checking")
      return "False" 


@frappe.whitelist()
def get_industries(user):
    try:
        sql  = """ select distinct(industry_type) from `tabJob Titles` where parent in (select assign_multiple_company from `tabCompanies Assigned` where parent="{0}") """.format(user)
        industries = frappe.db.sql(sql, as_dict=True)
        accreditation = frappe.db.sql(""" select attribute from `tabCertificate and Endorsement` """,as_dict=1)
        accreditation = [acr['attribute'] for acr in accreditation]
        data = [ind['industry_type'] for ind in industries]
        comps = frappe.db.sql(""" select name from `tabCompany` where organization_type="Staffing" """,as_dict=1)
        comps = [c['name'] for c in comps]
        comps = '\n'.join(comps)
        return data,accreditation,comps
    except Exception as e:
        frappe.log_error(e, "Industries error")
        print(e)

def get_conditions(filters):
    cond = cond1= cond2= ''
    if filters.get('company',None) not in [None,""]:
        cond1 += """ and name like '%{company}%' """.format(company=filters.get('company'))
    if filters.get('industry',None) not in [None,""]:
        cond += """ and industry="{industry}" """.format(industry=filters.get('industry'))
    if filters.get('city',None) not in [None,""]:
        cond1 += """ and city like '%{0}%' """.format(filters.get('city'))
    if filters.get('rating',None) not in [None,""]:
        cond1 += """ and average_rating >={rating} """.format(rating=filters.get('rating'))
    if filters.get('accreditation',None) not in [None,""]:
        cond2 += """  and ce.certificate_type="{accreditation}" """.format(accreditation=filters.get('accreditation'))
    return cond,cond1,cond2

def filter_location(radius,comp,data):
    try:
        staff_location = None
        address = frappe.db.get_value('Company',{'name':comp[0][0]},'address') or None
        if address:
            location = get_custom_location(address)
            for d in data:
                if d.address:
                    staff_location = get_custom_location(d.address)
                try:
                    rad = haversine(location, staff_location, unit='mi')
                    if rad>radius:
                        data.remove(d)
                except Exception:
                    continue
        return data
    except Exception as e:
        print(e)

def get_custom_location(address):
    lat, lng = get_lat_lng(address)
    return tuple([lat, lng])

def hiring_data(filters,user_name,comp_id,start,end):
    cond=cond1 =cond2 = ''
    try:
        if filters:
            filters = json.loads(filters)
            cond,cond1,cond2 = get_conditions(filters)
        sql = ''' select company from `tabUser` where email='{}' '''.format(user_name)
        user_comp = frappe.db.sql(sql, as_list=1)
        
        sql = """  select c.*,count(ce.name) as count,ce.certificate_type as accreditation from `tabCompany` c 
        left join `tabCertificate and Endorsement Details` ce 
        on c.name = ce.company 
        where c.name in (select parent from `tabIndustry Types` where parent in (select name from `tabCompany` where organization_type='Staffing' {2}) 
        and industry_type in (select industry_type  from `tabIndustry Types` where parent='{0}'  ))  {1}  {3}   group by c.name limit {4},{5}
        """.format(user_comp[0][0],cond,cond1,cond2,start,end)
       
        data = frappe.db.sql(sql, as_dict=True)
        data = check_blocked_staffing(user_name=user_name, data=data)
        if filters.get('radius',None):
            radius = filters.get('radius')
            data = filter_location(radius,user_comp,data)
        
        if comp_id:
            data=frappe.db.sql(sql, as_list=True)
            company_name=data[int(comp_id)-1][0]
            return company_data(company_name)
            
        return data
    except Exception as e:
        print(e)

@frappe.whitelist()
def get_count(company):
    try:
        data = frappe.db.sql(""" select count(*) as count from `tabCertificate and Endorsement Details` where company="{0}" """.format(company),as_dict=1)
        if len(data):
            return data[0]['count']
        return 0
    except Exception as e:
        print(e)

@frappe.whitelist()
def get_title(company):
    try:
        data = frappe.db.sql(""" select certificate_type as type from `tabCertificate and Endorsement Details` where company="{0}" """.format(company),as_dict=1)
        title = [d['type'] for d in data]
        print(title)
        return title
    except Exception as e:
        print(e)

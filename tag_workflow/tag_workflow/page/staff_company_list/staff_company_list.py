from time import process_time
import frappe

# this file for TG-2607
@frappe.whitelist()
def comp(comp_id=None,company_name=None):
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
                sql = ''' select company from `tabUser` where email='{}' '''.format(user_name)
                user_comp = frappe.db.sql(sql, as_list=1)

                sql = """  select * from `tabCompany` where name in (select parent from `tabIndustry Types` where parent in (select name from `tabCompany` where organization_type='Staffing') and industry_type in (select industry_type  from `tabIndustry Types` where parent='{}')) """.format(user_comp[0][0])
                data = frappe.db.sql(sql, as_dict=True)
                data = check_blocked_staffing(user_name=user_name, data=data)
                
                if comp_id:
                    data=frappe.db.sql(sql, as_list=True)
                    company_name=data[int(comp_id)-1][0]
                    return company_data(company_name)
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
'''
    TAG Master Data
'''

import frappe
from frappe import _
from frappe.config import get_modules_from_all_apps
import json
from pathlib import Path
from tag_workflow.utils.trigger_session import share_company_with_user
from tag_workflow.controllers.master_controller import make_update_comp_perm, user_exclusive_perm
import googlemaps
from tag_workflow.utils.whitelisted import get_user_company_data
from tag_workflow.utils.notification import make_system_notification
tag_gmap_key = frappe.get_site_config().tag_gmap_key or ""
GOOGLE_API_URL=f"https://maps.googleapis.com/maps/api/geocode/json?key={tag_gmap_key}&address="
migrate_sch = 'Migrate/Scheduler'

#-------setup variables for TAG -------------#
tag_workflow= "Tag Workflow"
Organization = "Organization Type"
Module = "Module Profile"
Role_Profile = "Role Profile"
Sign_Label = "Signature Section"
Job_Label = "Job Order"
Custom_Label = "Custom Field"
WEB_MAN = "Website Manager"
USR, EMP, COM = "User", "Employee", "Company"
Global_defaults="Global Defaults"
Temp_Emp = "Temp Employee"
Job_Site = 'Job Site'
Emp_Onb_Temp = 'Employee Onboarding Template'
Not_Set = 'not set'

ALL_ROLES = [role.name for role in frappe.db.get_list("Role", {"name": ["!=", "Employee"]}, ignore_permissions=True) or []]

ADD_ORGANIZATION = ["Company", "Quotation", "Lead"]
ADD_ORGANIZATION_DATA = ["TAG", "Hiring", "Staffing", "Exclusive Hiring"]

ROLES = ["Hiring User", "Hiring Admin", "Staffing User", "Staffing Admin", "Tag Admin", "Tag User", "CRM User", "Staff"]

ROLE_PROFILE = [{ROLES[4]: ALL_ROLES}, {ROLES[5]: ALL_ROLES}, {ROLES[3]: ["Accounts User", "Sales User", ROLES[3], ROLES[6], "Employee"]}, {ROLES[2]: ["Accounts User", "Sales User", ROLES[6], "Employee", ROLES[2]]}, {ROLES[1]: [ROLES[1], ROLES[6], "Employee", "Projects User"]}, {ROLES[0]: [ROLES[6], "Employee", ROLES[0], "Projects User"]}]

MODULE_PROFILE = [{"Staffing": ["CRM", "Projects", tag_workflow, "Accounts", "Selling"]}, {"Tag Admin": ["Core", "Workflow", "Desk", "CRM", "Projects", "Setup", tag_workflow, "Accounts", "Selling", "HR"]}, {"Hiring": ["CRM", tag_workflow, "Selling"]}]

SPACE_PROFILE = ["CRM", "Users", tag_workflow, "Settings", "Home", "My Activities", "Reports"]


#------setup data for TAG -------------#
@frappe.whitelist()
def call_setup():
    try:
        frappe.enqueue("tag_workflow.utils.organization.setup_data",queue='long',timeout=4000,job_name='setup_data')
        frappe.msgprint("Setup functions started in background.")
    except Exception as e:
        print(e)

def setup_data():
    try:
        frappe.db.set_value(Global_defaults,Global_defaults,"default_currency", "USD")
        frappe.db.set_value(Global_defaults,Global_defaults,"hide_currency_symbol", "No")
        frappe.db.set_value(Global_defaults,Global_defaults,"disable_rounded_total", "1")
        frappe.db.set_value(Global_defaults,Global_defaults,"country", "United States")
        update_organization_data()
        update_roles()
        update_tag_user_type()
        update_role_profile()
        update_module_profile()
        update_permissions()
        update_old_data_import()
        update_old_direct_order()
        update_old_company_type()
        update_old_job_sites()
        create_job_applicant()
        set_workspace()
        setup_company_permission()
        check_if_user_exists()
        update_job_title_list()
        update_old_lead_status()
        share_company_with_user()
        emp_job_title()
        update_salary_structure()
        updating_date_of_joining()
        update_password_field()
        staffing_radius()
        set_default_template()
        set_template_name()
        get_user_company_data()
        disable_scheduler()
        make_commit()
    except Exception as e:
        print(e)
        frappe.log_error(e, "Master")
        #frappe.db.rollback()

#--------org_update----------#
def update_organization_data():
    try:
        print("*------updating organization data-----------*\n")
        frappe.logger().debug("*------updating organization data-----------*\n")
        sql = """ delete from `tabOrganization Type` """
        frappe.db.sql(sql)
        for data in ADD_ORGANIZATION_DATA:
            org_doc = frappe.get_doc(dict(doctype = Organization, organization = data))
            org_doc.save()
        frappe.db.sql(""" delete from `tabDashboard` """)
    except Exception as e:
        print(e)
        frappe.log_error(e, "update_organization_data")

#--------role_update----------#
def update_roles():
    try:
        print("*------updating roles-----------------------*\n")
        frappe.logger().debug("*------roles-----------*\n")
        for role in ROLES:
            if not frappe.db.exists("Role", {"name": role}):
                role_doc = frappe.get_doc(dict(doctype = "Role", role_name = role, desk_access = 1, search_bar = 1, notifications = 1, list_sidebar = 1, bulk_action = 1, view_switcher = 1, form_sidebar = 1, timeline = 1, dashboard = 1))
                role_doc.save()
    except Exception as e:
        print(e)
        frappe.log_error(e, "update_roles")

#--------role_profile_update----------#
def update_role_profile():
    try:
        print("*------updating role profile----------------*\n")
        frappe.logger().debug("*------updating role profile-----------*\n")
        profiles = {k for role in ROLE_PROFILE for k in role.keys()}
        for profile in profiles:
            try:
                profile_data = [role[profile] for role in ROLE_PROFILE if profile in role][0]

                if not frappe.db.exists(Role_Profile, {"name": profile}):
                    profile_doc = frappe.new_doc(Role_Profile)
                    profile_doc.role_profile = profile
                    for data in profile_data:
                        profile_doc.append("roles", {"role": data})
                else:
                    profile_doc = frappe.get_doc(Role_Profile, {"name": profile})
                    profile_doc.roles = []
                    for data in profile_data:
                        profile_doc.append("roles", {"role": data})
                profile_doc.save()
            except Exception:
                continue
    except Exception as e:
        print(e)
        frappe.log_error(frappe.get_traceback(), "update_role_profile")

#--------module_update----------#
def update_module_profile():
    try:
        print("*------updating module profile--------------*\n")
        frappe.logger().debug("*------updating module profile-----------*\n")
        all_modules = [m.get("module_name") for m in get_modules_from_all_apps()]
        modules = {k for module in MODULE_PROFILE for k in module.keys()} 
        print(modules)
        for mods in modules:
            print(mods)
            module_data = [profile[mods] for profile in MODULE_PROFILE if mods in profile][0]

            if not frappe.db.exists(Module, {"name": mods}):
                module_doc = frappe.new_doc(Module)
                module_doc.module_profile_name = mods
                module_doc = module_data_update(all_modules, module_data, module_doc)
                module_doc.save()
    except Exception as e:
        print(e)
        frappe.log_error(e, "update_module_profile")

def module_data_update(all_modules, module_data, module_doc):
    try:
        for data in all_modules:
            if(data not in module_data):
                module_doc.append("block_modules", {"module": data})
        return module_doc
    except Exception as e:
        print(e)
        frappe.log_error(e, "module_data_update")

#--------permissions_update----------#
def update_permissions():
    try:
        print("*------updating permissions-----------------*\n")
        frappe.logger().debug("*------updating permissions-----------*\n")
        sql = """ delete from `tabCustom DocPerm` """
        frappe.db.sql(sql)
        FILE_PATH = str(Path(__file__).resolve().parent) + "/role_permission.json"
        refactor_permission_data(FILE_PATH)

        with open(FILE_PATH, 'r') as data_file:
            permissions = json.load(data_file)

        for perm in permissions:
            permission_doc = frappe.get_doc(dict(perm))
            permission_doc.save()
    except Exception as e:
        print(e)
        frappe.log_error(e, "update_permissions")


def refactor_permission_data(file_path):
    try:
        with open(file_path, 'r') as data_file:
            data = json.load(data_file)

        for element in data:
            element.pop('name', '')
            element.pop('modified', '')

        with open(file_path, 'w') as data_file:
            json.dump(data, data_file)
    except Exception as e:
        print(e)
        frappe.log_error(e, "refactor_permission_data")


# workspace update
def set_workspace():
    try:
        print("*------updating workspace-------------------*\n")
        frappe.logger().debug("*------updating workspace-----------*\n")
        workspace = frappe.get_list("Workspace", ['name'])
        for space in workspace:
            if(space.name not in SPACE_PROFILE):
                frappe.delete_doc("Workspace", space.name, force=1)
    except Exception as e:
        frappe.log_error(e, "set_workspace")

# permission for various purpose
def setup_company_permission():
    try:
        print("*------company permission-------------------*\n")
        frappe.logger().debug("*------company permission-----------*\n")
        companies = frappe.get_list("Company", ["name"])
        for com in companies:
            make_update_comp_perm(com.name)
    except Exception as e:
        frappe.log_error(e, "setup_company_permission")
        print(e)

# check user employee data
def check_if_user_exists():
    try:
        print("*------user update--------------------------*\n")
        user_list = frappe.get_list(USR, ["name", "organization_type", "company"])
        for user in user_list:
            if(frappe.db.exists(EMP, {"user_id": user.name})):
                company, date_of_joining = frappe.db.get_value(EMP, {"user_id": user.name}, ["company", "date_of_joining"])
                sql = """ UPDATE `tabUser` SET company = "{0}", date_of_joining = "{1}" where name = "{2}" """.format(company, date_of_joining, user.name)
                frappe.db.sql(sql)

            if(user.company):
                user_exclusive_perm(user.name, user.company, user.organization_type)
    except Exception as e:
        frappe.log_error(e, "user update")
        print(e)

# job title update
def update_job_title_list():
    try:
        print("*------job title list-----------------------*\n")
        frappe.logger().debug("*------updating job title list-----------*\n")
        job_designation_list=frappe.db.sql('select name,industry_type,price,description,designation_name from `tabDesignation` where organization is null and industry_type is not null;',as_dict=1)      
        if(len(job_designation_list)>0):
            for i in range(len(job_designation_list)):  
                if not frappe.db.exists("Item", {"name":job_designation_list[i].name}):
                    role_doc = frappe.get_doc(dict(doctype = "Item", industry = job_designation_list[i].industry_type,job_titless=job_designation_list[i].name,rate=job_designation_list[i].price,item_code=job_designation_list[i].name,item_group="All Item Groups",stock_uom="Nos",descriptions=job_designation_list[i].description, company=""))
                    role_doc.save()

    except Exception as e:
        frappe.log_error(e, "job title update")
        print(e)

#--------User Type Update for TAG----------#
def update_tag_user_type():
    try:
        print("*------updating user type-------------------*\n")
        frappe.logger().debug("*------updating user_type-----------*\n")
        tag_admin = tag_admin = frappe.get_list('User',fields= ['name'],filters= {'tag_user_type': 'Tag Admin'}, as_list=1)
        if(len(tag_admin)>0):
            for name in tag_admin:
                sql = '''UPDATE `tabUser` set tag_user_type = "{0}" where name = "{1}";'''.format("TAG Admin", name[0])
                frappe.db.sql(sql)
    except Exception as e:
        frappe.log_error(e, "Update Tag User Type")
        print(e)

def update_old_lead_status():
    try:
        print('*------updating old lead status-------------*\n')
        frappe.logger().debug("*------updating old lead status-----------*\n")
        old_leads=frappe.db.sql('select name, company_name,status from `tabLead` where company_name in (select name from `tabCompany` where organization_type="Exclusive Hiring") and status="Open";',as_dict=1)
        if(len(old_leads)>0):
            for i in range(len(old_leads)):
                if frappe.db.exists('Lead',{"name":old_leads[i].name}):
                    frappe.db.set_value("Lead",old_leads[i].name,"status", "Close")
    except Exception as e:
        frappe.log_error(e,'Lead Update Error')
        print(e)

def update_old_direct_order():
    try:
        print('*------updating old direct order------------*\n')
        old_order=frappe.db.sql(""" select name,staff_company,resumes_required from `tabJob Order` where staff_company is not null and is_single_share=0; """,as_dict=1)
        if(len(old_order)>0):
            check_is_single_share(old_order)
    except Exception as e:
        frappe.log_error(e,'Old Direct Order')

def check_is_single_share(old_order):
    try:
        for i in range(len(old_order)):
            single_share(old_order,i)

    except Exception as e:
        frappe.log_error(e, 'check_is_single_share')

    
def single_share(old_order,i):
    try:
        if(old_order[i].resumes_required==0):
            claims=frappe.db.sql(""" select name from `tabClaim Order` where job_order="{0}" and staff_claims_no!=no_of_workers_joborder and staffing_organization="{1}" """.format(old_order[i].name,old_order[i].staff_company),as_dict=1)
            if(len(claims)==0):
                frappe.db.set_value(Job_Label,old_order[i].name,"is_single_share", 1)
        else:
            assign_employee=frappe.db.sql(""" select name from `tabAssign Employee` where job_order="{0}"  and company="{1}" """.format(old_order[i].name,old_order[i].staff_company),as_dict=1)
            if(len(assign_employee)==1):
                doc=frappe.get_doc('Assign Employee',assign_employee[0].name)
                if(len(doc.employee_details)==doc.no_of_employee_required):
                    frappe.db.set_value(Job_Label,old_order[i].name,"is_single_share", 1)
    except Exception as e:
        frappe.log_error(e, 'check_is_single_share')

def emp_job_title():
    try:
        print("*------updating employee job title----------*\n")
        frappe.logger().debug("*------updating employee job title-----------*\n")
        sql = '''SELECT parent, GROUP_CONCAT(job_category ORDER BY idx) AS category FROM `tabJob Category` GROUP BY parent'''
        emp = frappe.db.sql(sql, as_dict = 1)
        for i in emp:
            categories = i.category.split(',')
            if len(categories) > 1:
                job_title = f'{categories[0]} + {len(categories)-1}'
            else:
                job_title = categories[0]
            frappe.db.set_value(EMP, i.parent, 'job_categories', job_title)
            frappe.db.set_value(EMP, i.parent, 'job_title_filter', i.category)
    except Exception as e:
        frappe.log_error(e, 'Update employee job title error')

        

#------Update Old Data Import-------
def update_old_data_import():
    try:
        data_imp=frappe.get_all('Data Import',fields=['name','user_company'],filters={'owner':'Administrator','reference_doctype':'Employee','user_company':['is',Not_Set]})
        tag_comp=frappe.get_all('User',fields=['company'],filters={"organization_type": 'TAG'})
        if(len(data_imp)>0 and len(tag_comp)>0):
            for i in data_imp:
                sql = """ UPDATE `tabData Import` SET user_company = "{0}" where name = "{1}" """.format(tag_comp[0].company,i.name )
                frappe.db.sql(sql)
    except Exception as e:
        frappe.log_error(e, 'Update OLd Data Import')
#-----Update Company Type--------
def update_old_company_type():
    try:
        jobs=frappe.get_all('Job Order',fields=['name','company'],filters={'company_type':['is',Not_Set]})
        if(len(jobs)>0):
            for i in jobs:
                company_type=frappe.get_doc('Company',i['company'])
                job_order=frappe.get_doc(Job_Label,i['name'])
                if(company_type.organization_type=='Hiring'):
                    job_order.company_type='Non Exclusive'
                else:
                    job_order.company_type='Exclusive'
                job_order.save()
        
    except Exception as e:
        frappe.log_error(e,'Old Job Order Updates')

#------Create Industry Type and Designation for Job Applicant------
def create_job_applicant():
    try:
        if not frappe.db.exists('Industry Type', {'name': 'Other'}):
            industry_type = frappe.get_doc(dict(doctype='Industry Type', industry="Other", name="Other"))
            industry_type.insert(ignore_permissions = True)
        if not frappe.db.exists('Designation', {'name': Temp_Emp}):
            designation = frappe.get_doc(dict(doctype = 'Designation', description= "Used for Onboarding Purposes", designation= Temp_Emp, designation_name= Temp_Emp,industry_type= "Other", name= Temp_Emp, price= 0.0, skills= []))
            designation.insert(ignore_permissions = True)
    except Exception as e:
        frappe.log_error(e,'Create Industry Type and Designation')

#---------------Remove job site custom field------------------------------------------------------------
def remove_field():
    try:
        fields = ['column_break_13','suite_or_apartment_no','favorite_staffing_company_list']
        for f in fields:
            if f=="favorite_staffing_company_list":
                if frappe.db.exists(Custom_Label,{'dt':'Company','fieldname':f}):
                    frappe.db.sql(""" delete from `tabCustom Field` where dt="Company" and fieldname="{0}" """.format(f))
                    frappe.db.commit()
                    print("*************************"f'{f}'   " Field Removed Successfully************************************")
                else:
                    print("*******************************"f'{f}'   " not found**********************************************************")
            else:
                if frappe.db.exists(Custom_Label,{'dt':Job_Site,'fieldname':f}):
                    frappe.db.sql(""" delete from `tabCustom Field` where dt="Job Site" and fieldname="{0}" """.format(f))
                    frappe.db.commit()
                    print("*************************"f'{f}'   " Field Removed Successfully************************************")
                else:
                    print("*******************************"f'{f}'   " not found**********************************************************")
    except Exception as e:
        print(e)
def update_old_job_sites():
    try:
        sites=f'select name,company from `tabJob Site` where name not in (select `tabJob Site`.name from `tabJob Site` inner join `tabIndustry Types Job Titles` on `tabIndustry Types Job Titles`.parent=`tabJob Site`.name) and company!="";'
        data=frappe.db.sql(sites,as_dict=1)
        if(len(data)>0):
            print("*------updating old job sites---------*\n")

            for i in data:
                dicts_val=frappe.db.sql('''select industry_type,job_titles,wages as bill_rate,description from `tabJob Titles` where parent="{0}"'''.format(i.company),as_dict=1)
                if len(dicts_val):
                    doc=frappe.get_doc(Job_Site,i.name)
                    try:
                        for j in dicts_val:
                            doc.append('job_titles',{'industry_type': j['industry_type'], 'job_titles': j['job_titles'], 'bill_rate': j['bill_rate'], 'description': j['description']})
                        doc.save(ignore_permissions=True)
                    except Exception as e:
                        continue
    except Exception as e:
        print(e)

def update_salary_structure():
    try:
        frappe.logger().debug("*------updating salary structure-----------*\n")
        company_names = frappe.db.sql("""select name from `tabCompany` where  organization_type = 'Staffing' OR organization_type = 'TAG'""",as_dict=1)
        for company_name in company_names:
            check = frappe.db.exists("Salary Structure",{"name":"Temporary Employees_"+company_name.name,"company":company_name.name})
            comp_name = "Basic Temp Pay"
            if not check:
                frappe.db.sql("""INSERT INTO `tabSalary Structure` (name,docstatus,company,is_active,payroll_frequency,salary_slip_based_on_timesheet,salary_component) VALUES ("{0}",1,"{1}","Yes","Weekly",1,"{2}")""".format("Temporary Employees_"+company_name.name,company_name.name,comp_name+"_"+company_name.name))
                frappe.db.sql("""INSERT INTO `tabSalary Component` (name,salary_component,salary_component_abbr,type,company,salary_component_name) VALUES("{0}","{1}","{2}","Earning","{3}","Basic Temp Pay")""".format(comp_name+"_"+company_name.name,"Basic Temp Pay_"+ company_name.name,"BTP_" + company_name.name,company_name.name))
            frappe.db.sql('''update `tabSalary Structure` set salary_component = "{0}" where salary_component = "Basic Temp Pay" AND company = "{1}"'''.format(comp_name+"_"+company_name.name,company_name.name))
    except Exception as e:
        print(e)



def updating_date_of_joining():
    try:
        print("*-----------Updating Date of Joining------------*")
        frappe.logger().debug("*------updating Date of Joining-----------*\n")
        frappe.db.sql("""update `tabEmployee` set date_of_joining = "2021-01-01" where date_of_joining is null""")
        frappe.db.sql("""Update `tabEmployee Onboarding` set date_of_joining = '2021-01-01' where date_of_joining is null""")
    except Exception as e:
        print(e)

def update_password_field():
    try:
        all_companies = frappe.get_all('Company', fields=['name'], filters={'organization_type':['=', 'Staffing']})
        for company in all_companies:
            company_data = frappe.get_doc('Company', company.name)
            if company_data.jazzhr_api_key and not company_data.jazzhr_api_key_data:
                frappe.db.sql(f'''UPDATE `tabCompany` SET jazzhr_api_key_data='{"•"*len(company_data.jazzhr_api_key)}' where name = "{company_data.name}"''')
            if company_data.client_id and not company_data.client_id_data:
                frappe.db.sql(f'''UPDATE `tabCompany` SET client_id_data='{"•"*len(company_data.client_id)}' where name = "{company_data.name}"''')
            if company_data.client_secret and not company_data.client_secret_data:
                frappe.db.sql(f'''UPDATE `tabCompany` SET client_secret_data='{"•"*len(company_data.client_secret)}' where name = "{company_data.name}"''')
            update_password_field_contd(company_data)
            remove_fields()
            frappe.db.commit()
    except Exception as e:
        print(e)

def update_password_field_contd(company_data):
    if company_data.workbright_subdomain and not company_data.workbright_subdomain_data:
        frappe.db.sql(f'''UPDATE `tabCompany` SET workbright_subdomain_data='{"•"*len(company_data.workbright_subdomain)}' where name = "{company_data.name}"''')
    if company_data.workbright_api_key and not company_data.workbright_api_key_data:
        frappe.db.sql(f'''UPDATE `tabCompany` SET workbright_api_key_data='{"•"*len(company_data.workbright_api_key)}' where name = "{company_data.name}"''')
    if company_data.branch_org_id and not company_data.branch_org_id_data:
        frappe.db.sql(f'''UPDATE `tabCompany` SET branch_org_id_data='{"•"*len(company_data.branch_org_id)}' where name = "{company_data.name}"''')
    if company_data.branch_api_key and not company_data.branch_api_key_data:
        frappe.db.sql(f'''UPDATE `tabCompany` SET branch_api_key_data='{"•"*len(company_data.branch_api_key)}' where name = "{company_data.name}"''')

def remove_fields():
    fields = ['decrypt_ssn', 'decrypted_ssn', 'decrypt_client_id', 'decrypt_client_secret', 'decrypted_client_id', 'decrypted_client_secret', 'decrypt_jazzhr_api_key', 'decrypted_jazzhr_api_key', 'decrypt_subdomain_api_key', 'decrypted_subdomain_api_key', 'decrypt_subdomain', 'decrypted_subdomain', 'decrypted_api', 'decrypt_api', 'decrypt_org_id', 'decrypted_org_id']
    for field in fields:
        if field in ['decrypt_ssn', 'decrypted_ssn']:
            if frappe.db.exists(Custom_Label,{'dt':'Employee','fieldname':field}):
                frappe.db.sql(f'''DELETE FROM `tabCustom Field` WHERE dt="Employee" and fieldname="{field}"''')
            if frappe.db.exists(Custom_Label,{'dt':'Employee Onboarding','fieldname':field}):
                frappe.db.sql(f'''DELETE FROM `tabCustom Field` WHERE dt="Employee Onboarding" and fieldname="{field}"''')
        elif frappe.db.exists(Custom_Label,{'dt':'Company','fieldname':field}):
            frappe.db.sql(f'''DELETE FROM `tabCustom Field` WHERE dt="Company" and fieldname="{field}"''')
        frappe.db.commit()

def staffing_radius():
    try:
        frappe.logger().debug("*------updating Staffing Radius----------*\n")
        check_table = frappe.db.sql('''SELECT * FROM information_schema.tables WHERE table_name = "tabStaffing Radius"''', as_dict=1)
        if len(check_table) == 0:
            frappe.db.sql('''CREATE TABLE `tabStaffing Radius` (name varchar(255) not null primary key,job_site varchar(140),hiring_company varchar(140),staffing_company varchar(140),radius varchar(140))''')
        frappe.enqueue('tag_workflow.utils.organization.staffing_jobsite_mapping', message=migrate_sch, queue='long', is_async=True,job_name="setup_data")
    except Exception as e:
        frappe.log_error(e, 'Staffing Radius Error')

@frappe.whitelist()
def initiate_background_job(message = None, job_site_name = None, staffing_company = None):
    condition = check_js_update(message, job_site_name, staffing_company) if message and message!=migrate_sch else False
    if condition == True or message==migrate_sch:
        frappe.enqueue('tag_workflow.utils.organization.staffing_jobsite_mapping', message=message, job_site_name=job_site_name, staffing_company=staffing_company, queue='default', is_async=True)

@frappe.whitelist()
def check_js_update(message, job_site_name, staffing_company):
    if message== Job_Site:
        js_details = frappe.db.sql(f'''SELECT data FROM `tabVersion` WHERE docname = "{job_site_name}" ORDER BY modified DESC''', as_dict=1)
        js_changed = json.loads(js_details[0].data) if len(js_details) > 0 else []
        if 'created_by'in js_changed:
            js_details = frappe.get_doc(Job_Site, job_site_name)
            return True if js_details.address or js_details.state or js_details.city or js_details.zip else False
        elif 'changed' in js_changed:
            check_js_update_contd(js_changed)
    else:
        return check_comp_update(message, staffing_company)
    return False

def check_js_update_contd(js_changed):
    for i in js_changed['changed']:
        if i[0] in ['address', 'state', 'city', 'zip']:
            return True
    return False

@frappe.whitelist()
def check_comp_update(message, staffing_company):
    if message== 'Company':
        comp_details = frappe.db.sql(f'''SELECT data FROM `tabVersion` WHERE docname = "{staffing_company}" ORDER BY modified DESC''', as_dict=1)
        comp_changed = json.loads(comp_details[0].data) if len(comp_details) > 0 else []
        if 'created_by' in comp_changed:
            comp_details = frappe.get_doc('Company', staffing_company)
            return True if comp_details.complete_address or comp_details.address or comp_details.state or comp_details.city or comp_details.zip else False
        elif 'changed' in comp_changed:
           return check_comp_update_contd(comp_changed)
    else:
        return False
    return False

def check_comp_update_contd(comp_changed):
    for i in comp_changed['changed']:
        if i[0] in ['complete_address', 'address', 'state', 'city', 'zip']:
            return True
    return False

@frappe.whitelist()
def staffing_jobsite_mapping(message = None, job_site_name = None, staffing_company = None):
    tag_gmap_key = frappe.get_site_config().tag_gmap_key or ""
    if not tag_gmap_key:
        frappe.msgprint(_("GMAP api key not found!"))
        return ()
    gmaps = googlemaps.Client(key=tag_gmap_key)

    company_data, job_site_data = get_data(message, job_site_name,staffing_company)
    for company in company_data:
        try:
            frappe.enqueue('tag_workflow.utils.organization.staffing_jobsite_mapping_contd', company = company, job_site_data=job_site_data, gmaps=gmaps, is_async= True, queue='long',job_name="setup_data")
        except Exception as e:
            frappe.log_error(e, 'staffing_job_site_mapping Company Error')
            continue
        
@frappe.whitelist()
def staffing_jobsite_mapping_contd(company, job_site_data, gmaps):
    try:
        source = get_source(company)
        for job_site in job_site_data:
            try:
                dest = get_dest(job_site)
                my_dist = gmaps.distance_matrix(source, dest)
                km = my_dist['rows'][0]['elements'][0]['distance']['value']/1000 if  my_dist['status'] == 'OK' and my_dist['rows'][0]['elements'][0]['status']=='OK' else None
                calculate_dist(km, company, job_site)
            except Exception as e:
                frappe.log_error(e, 'staffing_job_site_mapping Job Site Error')
                continue
    except Exception as e:
        frappe.log_error(e, 'staffing_job_site_mapping_contd Error')

@frappe.whitelist()
def get_data(message, job_site_name, staffing_company):
    if message == Job_Site:
        job_site_data = frappe.db.sql(f'''SELECT name, search_on_maps, manually_enter, job_site, address, company, state, zip, suite_or_apartment_no FROM `tabJob Site` where name = "{job_site_name}"''',as_dict=1)
        company_data = frappe.db.sql('''SELECT name, search_on_maps, enter_manually, complete_address, address, state ,zip, suite_or_apartment_no FROM `tabCompany` where organization_type="Staffing"''',as_dict=1)
    elif message == 'Company':
        job_site_data = frappe.db.sql('''SELECT name, search_on_maps, manually_enter, job_site, address, company, state, zip, suite_or_apartment_no FROM `tabJob Site`''',as_dict=1)
        company_data = frappe.db.sql(f'''SELECT name, search_on_maps, enter_manually, complete_address, address, state, zip, suite_or_apartment_no FROM `tabCompany` where name = "{staffing_company}"''',as_dict=1)
    else:
        job_site_data = frappe.db.sql('''SELECT name, search_on_maps, manually_enter, job_site, address, company, state, zip, suite_or_apartment_no FROM `tabJob Site`''',as_dict=1)
        company_data = frappe.db.sql('''SELECT name, search_on_maps, enter_manually, complete_address, address, state, zip, suite_or_apartment_no FROM `tabCompany` where organization_type="Staffing"''',as_dict=1)
    return company_data, job_site_data

def get_source(company):
    try:
        if company.enter_manually:
            address = company.street_address if company.street_address else ''
        else:
            address = company.complete_address if company.complete_address else ''
        city = company.city if company.city else ''
        state = company.state if company.state else ''
        zip_code = str(company.zip) if company.zip else ''
        return address+","+city+","+state+","+zip_code
    except Exception as e:
        frappe.log_error(e, 'staffing_job_site_mapping Get Source Error')

def get_dest(job_site):
    try:
        address = job_site.address if job_site.address else ''
        city = job_site.city if job_site.city else ''
        state = job_site.state if job_site.state else ''
        zip_code = job_site.zip if job_site.zip else ''
        return address+","+city+","+state+","+zip_code
    except Exception as e:
        frappe.log_error(e, 'staffing_job_site_mapping Get Destination Error')

@frappe.whitelist()
def calculate_dist(km, company, job_site):
    try:
        dist = str(km*0.62137) if km!=None else None
        frappe.db.sql(f'''INSERT INTO `tabStaffing Radius` (name, job_site, hiring_company, staffing_company, radius) VALUES("{company.name}_{job_site.name}", "{job_site.name}", "{job_site.company}", "{company.name}", "{dist}") ON DUPLICATE KEY UPDATE radius = "{dist}"''')
        frappe.db.commit()
    except Exception as e:
        frappe.log_error(e, 'staffing_job_site_mapping Distance Calculation Error')

def make_commit():
    try:
        print("*------making-sql-commit-----------------------*\n")
        frappe.logger().debug("*------commit-----------*\n")
        frappe.db.commit()
    except Exception as e:
        print(e)

@frappe.whitelist()
def get_job_status():
    try:
        from rq import Queue, Worker
        from frappe.utils.background_jobs import get_redis_conn
        conn = get_redis_conn()
        workers = Worker.all(conn)
        queues = Queue.all(conn)

        for worker in workers:
            job = worker.get_current_job()
            if job and job.kwargs.get('job_name') == 'setup_data':
                    return 1

        for queue in queues:
            for job in queue.jobs:
                if job and job.kwargs.get('job_name') == 'setup_data':
                    return 1
        return 0
    except Exception as e:
        return 0
        frappe.msgprint(e)
def set_default_template():
    try:
        frappe.logger().debug("*------updating default employee onboarding template---------*\n")
        staffing_companies = set([c['company'] for c in frappe.get_all(Emp_Onb_Temp, ['company'])])
        for company in staffing_companies:
            comp_data = frappe.get_all(Emp_Onb_Temp, {'company': company, 'default_template':1}, ['name'])
            if not comp_data:
                temp_name = frappe.db.sql(f'''SELECT name FROM `tabEmployee Onboarding Template` WHERE company="{company}" ORDER BY creation LIMIT 1''', as_dict=1)
                frappe.db.sql(f'''UPDATE `tabEmployee Onboarding Template` SET default_template = 1 WHERE name={temp_name[0]["name"]}''')
                frappe.db.commit()
    except Exception as e:
        frappe.log_error(e, 'set_default_template Error')

@frappe.whitelist()
def set_template_name():
    try:
        frappe.logger().debug("*------updating template name for old employee onboarding---------*\n")
        emp_onb = frappe.get_all('Employee Onboarding', {'employee_onboarding_template': ['is', 'set'], 'template_name':['is', Not_Set]}, ['name'])
        emp_onb_list = [e['name'] for e in emp_onb]
        if len(emp_onb_list) > 0:
            if len(emp_onb_list)==1:
                frappe.db.sql(f'''UPDATE `tabEmployee Onboarding` set template_name=employee_onboarding_template where name in ("{emp_onb_list[0]}")''')
            else:
                frappe.db.sql(f'''UPDATE `tabEmployee Onboarding` set template_name=employee_onboarding_template where name in {tuple(emp_onb_list)}''')
            frappe.db.commit()

        emp_onb_temp = frappe.get_all(Emp_Onb_Temp, {'template_name':['is', Not_Set]}, ['name'])
        emp_onb_temp_list = [e['name'] for e in emp_onb_temp]
        if len(emp_onb_temp_list) > 0:
            if len(emp_onb_temp_list)==1:
                frappe.db.sql(f'''UPDATE `tabEmployee Onboarding` set template_name=employee_onboarding_template where name in ("{emp_onb_temp_list[0]}")''')
            else:
                frappe.db.sql(f'''UPDATE `tabEmployee Onboarding Template` set template_name=name where name in {tuple(emp_onb_temp_list)}''')
            frappe.db.commit()
    except Exception as e:
        frappe.log_error(e, 'set_template_name Error')

def disable_scheduler():
    try:
        print("*------disable scheduler-----------------------*\n")
        frappe.db.sql(""" update `tabSingles` set value=1 where doctype="System Settings" and field="job_disable" """)
    except Exception as e:
        print(e)
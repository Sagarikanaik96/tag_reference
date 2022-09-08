import requests
import json
import frappe




def authenticate_workbright(company_name):
    comp = frappe.get_doc("Company",company_name)
    decrypted_api_key = comp.get_password('workbright_api_key')
    decrypted_subdomain = comp.get_password('workbright_subdomain')
    WORKBRIGHT_API_URL = "https://" + decrypted_subdomain + ".workbright.com"
    headers = {
        'api-key': decrypted_api_key,
        'content-type': 'application/json',
    }
    response = requests.get(WORKBRIGHT_API_URL, headers=headers)
    return response.status_code

@frappe.whitelist()
def workbright_create_employee(frm, company_name, first_name, last_name, job_applicant, contact_number=None, complete_address=None, employee_gender=None, date_of_birth=None, decrypted_ssn=None):
    authenticate_response = authenticate_workbright(company_name)
    comp = frappe.get_doc("Company",company_name)
    decrypted_subdomain = comp.get_password('workbright_subdomain')
    decrypted_api_key = comp.get_password('workbright_api_key')
    emp = frappe.get_doc("Employee Onboarding",frm)
    ssn_decrypt = emp.get_password('ssn')
    if employee_gender == 'Male':
        employee_gender = 'M'
    elif employee_gender == 'Female':
        employee_gender = 'F'
    else:
        employee_gender = 'X'
    if authenticate_response == 200:
        WORKBRIGHT_API_URL = "https://" + decrypted_subdomain + ".workbright.com/api/employees"
        if complete_address:
            complete_address = complete_address.split(', ')
            city = complete_address[0]
            state_zip = complete_address[1]
            state_li = state_zip.split(' ')
            state = state_li[0]
            zip_code = state_li[1]
            country = complete_address[2]
        else:
            city = ''
            state = ''
            zip_code = ''
            country = ''
        employee_email = job_applicant.split(" - ")[1]

        headers = {
            'api-key': decrypted_api_key,
            'content-type': 'application/json',
        }
        json_data = {
            'employee': {
                'email': employee_email,
                'first_name': first_name,
                'last_name': last_name,
                'birthdate': date_of_birth,
                'phone' : contact_number,
                'gender': employee_gender,
                'ssn': ssn_decrypt,
                'address':{
                    "city":city,
                    "state":state,
                    "zip":zip_code,
                    "country":country
                }
            }
        }

        response = requests.post(WORKBRIGHT_API_URL, headers=headers, json=json_data)
        content = response.content.decode("utf-8") 
        content_dict = json.loads(content)
        if response.status_code == 200:
            return {'status': 200, 'workbright_emp_id': content_dict['employment']['employee_id']}
        elif response.status_code == 422:
            return {'status': 422}
        else:
            return {'status': 500}
    else:
        return {'status': 401, 'message': "User is not authenticated!!"}


@frappe.whitelist()
def save_workbright_employee_id(job_applicant, workbright_emp_id):
    try:
        sql = """update `tabEmployee Onboarding` set workbright_id ={0} where job_applicant = '{1}'""".format(workbright_emp_id, job_applicant)
        frappe.db.sql(sql)
        frappe.db.commit()
        return 1
    except Exception as e:
        print(e, frappe.get_traceback())  

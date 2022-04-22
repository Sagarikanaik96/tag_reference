import frappe
from frappe import _, msgprint, throw
import json, requests, time

tag_gmap_key = frappe.get_site_config().tag_gmap_key or ""

JAZZHR_API_URL="https://api.resumatorapi.com/v1/applicants/"
JAZZHR_API_KEY_PARAM = "?apikey="
GOOGLE_API_URL=f"https://maps.googleapis.com/maps/api/geocode/json?key={tag_gmap_key}&address="
JAZZHR_RATE_LIMIT_CALLS = 80
JAZZHR_RATE_LIMIT_SECONDS = 60


@frappe.whitelist()
def jazzhr_fetch_applicants(api_key, company, action):
    try:
        action = int(action)
        frappe.enqueue("tag_workflow.utils.jazz_integration.jazzhr_fetch_applicants_long", queue='long', timeout=15000, api_key=api_key, company=company, action=action)
    except Exception as e:
        #frappe.msgprint('jazzhr_fetch_applicants errored out')
        frappe.log_error(e, "JazzHR - jazzhr_fetch_applicants fail long")

def jazzhr_fetch_applicants_long(api_key, company, action):
    try:
        fetch_applicants = 1
        page_no = 1
        while(fetch_applicants > 0):
            if(page_no % JAZZHR_RATE_LIMIT_CALLS == 0):
                time.sleep(JAZZHR_RATE_LIMIT_SECONDS)

            applicants_data_url= JAZZHR_API_URL + "page/" + str(page_no) + JAZZHR_API_KEY_PARAM + api_key
            response = requests.get(applicants_data_url)
            applicants = response.json()
            page_no += 1

            if(response.status_code == 200 and len(applicants) > 0):
                count = 1
                exce = 1
                for a in applicants:
                    try:
                        # enqueue with increasing time to take care of rate limiting
                        if(count % JAZZHR_RATE_LIMIT_CALLS == 0):
                            time.sleep(JAZZHR_RATE_LIMIT_SECONDS)
                        frappe.enqueue("tag_workflow.utils.jazz_integration.jazzhr_fetch_applicant_details", timeout=600,  api_key=api_key, applicant_id=a['id'], company=company, action=action)
                        count += 1
                        exce = 1
                    except Exception as e:
                        #frappe.msgprint('Some Error Occured while storing data. Please try again')
                        frappe.log_error(e, "JazzHR - jazzhr_fetch_applicant_details fail")
                        count -= 1
                        exce += 1
                        if(exce <= 5):
                            continue
            elif(len(applicants) <= 0):
                fetch_applicants = 0
    except Exception as e:
        #frappe.msgprint('jazzhr_fetch_applicants errored out')
        frappe.log_error(e, "JazzHR - jazzhr_fetch_applicants fail long")

#--------------------------------------#
@frappe.whitelist()
def jazzhr_fetch_applicant_details(api_key, applicant_id, company, action):
    try:
        applicant_details_url = JAZZHR_API_URL + applicant_id + JAZZHR_API_KEY_PARAM + api_key
        response = requests.get(applicant_details_url)
        applicant_details = response.json()
        applicant_key = f"{company}-{applicant_id}"

        if(len(applicant_details) > 0):
            # save entire applicant record to redis
            redis = frappe.cache()
            redis.hset(applicant_key, 'employee_number', applicant_id)
            redis.hset(applicant_key, 'first_name', applicant_details['first_name'].strip('"'))
            redis.hset(applicant_key, 'last_name', applicant_details['last_name'].strip('"'))
            redis.hset(applicant_key, 'company', company)
            redis.hset(applicant_key, 'contact_number', applicant_details['phone'] or "")
            redis.hset(applicant_key, 'employee_gender', applicant_details['eeo_gender'] if applicant_details['eeo_gender'] in ["Male", "Female"] else '')
            redis.hset(applicant_key, 'military_veteran', 1 if applicant_details['eeoc_veteran'] == 'I AM A PROTECTED VETERAN' else 0)
            redis.hset(applicant_key, 'street_address', applicant_details['address'] if applicant_details['address'] != 'Unavailable' and applicant_details['address'] != '' else '')
            redis.hset(applicant_key, 'email', applicant_details['email'] or "")
            redis.hset(applicant_key, 'city', '')
            redis.hset(applicant_key, 'state', '')
            redis.hset(applicant_key, 'zip', 0)

            # fetch location data from google
            if((applicant_details['location'] and applicant_details['location']) != '(No City Provided) (No State Provided) (No Postal Code Provided)'):
                google_location_data_url = GOOGLE_API_URL + applicant_details['location']
                google_response = requests.get(google_location_data_url)
                location_data = google_response.json()

                if(google_response.status_code == 200 and len(location_data)>0 and len(location_data['results'])>0):
                    state, city, zip_code = emp_zip_city(location_data)
                    redis.hset(applicant_key, 'city', city)
                    redis.hset(applicant_key, 'state', state)
                    redis.hset(applicant_key, 'zip', zip_code)
            # save to DB?
            if(action == 1):
                save_emp_to_db(applicant_id, company)
            elif(action == 2):
                update_emp_to_db(applicant_id, company)
    except Exception as e:
        #frappe.msgprint('Error Occured')
        frappe.log_error(e, "JazzHR applicant detail")
        #frappe.throw(e)

def emp_zip_city(address_dt):
    try:
        state, city, zip_code = '', '', 0
        state_data = address_dt['results'][0]['address_components']
        for i in state_data:
            if 'administrative_area_level_1' in i['types']:
                state = i['long_name'] if i['long_name'] else ''
            elif 'postal_code' in i['types']:
                zip_code = int(i['long_name']) if i['long_name'].isdigit() else 0

        city_zip = address_dt['results'][0]['formatted_address'].split(',')
        city = city_zip[-3].strip() if len(city_zip)>2 and city_zip[-3].strip() else ''
        return state, city, zip_code
    except Exception as e:
        #frappe.msgprint('Some Error Occured while fetching address')
        frappe.log_error(e, "JazzHR address")
        return '', '', 0


#-----------------------------#
def save_emp_to_db(applicant_id, company):
    try:
        applicant_key = f"{company}-{applicant_id}"
        redis = frappe.cache()

        if not frappe.db.exists("Employee", {"employee_number": applicant_id, "company": company}):
            emp = frappe.new_doc("Employee")
            emp.employee_number = redis.hget(applicant_key, 'employee_number')
            emp.first_name = redis.hget(applicant_key, 'first_name')
            emp.last_name = redis.hget(applicant_key, 'last_name')
            emp.company = redis.hget(applicant_key, 'company')
            emp.contact_number = redis.hget(applicant_key, 'contact_number')
            emp.employee_gender = redis.hget(applicant_key, 'employee_gender')
            emp.military_veteran = redis.hget(applicant_key, 'military_veteran')
            emp.street_address = redis.hget(applicant_key, 'street_address')
            emp.email = redis.hget(applicant_key, 'email')
            emp.city = redis.hget(applicant_key, 'city')
            emp.state = redis.hget(applicant_key, 'state')
            emp.zip = redis.hget(applicant_key, 'zip')
            emp.save(ignore_permissions=True)

        #delete from redis
        redis.delete(applicant_id)
    except Exception as e:
        #frappe.msgprint('Some Error Occured')
        frappe.log_error(e, "JazzHR emp save")
        #frappe.throw(e)



#--------------------------update emp records------------------#
@frappe.whitelist()
def jazzhr_update_applicants(api_key, company, action):
    try:
        emp_list = frappe.db.sql(""" select name, employee_number from `tabEmployee` where company = %s and employee_number IS NOT NULL and (first_name IN(NULL, "undefined", "None", "") or last_name IN(NULL, "unavailable", "None", "") or employee_gender IN(NULL, "undefined", "None", "") or contact_number IN(NULL, "undefined", "None", "") or employee_gender IN(NULL, "undefined", "None", "") or street_address IN(NULL, "undefined", "None", "") or email IN(NULL, "undefined", "None", "") or city IN(NULL, "undefined", "None", "") or state IN(NULL, "undefined", "None", "") or zip = 0) """,company, as_dict=1)
        #print(len(emp_list), emp_list)
        count = 1
        exce = 1
        for e in emp_list:
            try:
                if(count % JAZZHR_RATE_LIMIT_CALLS == 0):
                    time.sleep(JAZZHR_RATE_LIMIT_SECONDS)
                frappe.enqueue("tag_workflow.utils.jazz_integration.jazzhr_fetch_applicant_details", api_key=api_key,applicant_id=e['employee_number'],company=company,action=int(action))
                count += 1
                exce = 1
            except Exception as e:
                frappe.log_error(e, "JazzHR emp applicant recall")
                exce += 1
                count -= 1
                if(exce <= 5):
                    continue
    except Exception as e:
        frappe.log_error(e, "JazzHR emp fetching")


def update_emp_to_db(applicant_id, company):
    try:
        applicant_key = f"{company}-{applicant_id}"
        redis = frappe.cache()
        emp = frappe.get_doc("Employee", {"employee_number": applicant_id, "company": company})
        for f in ["first_name", "last_name", "contact_number", "employee_gender", "street_address", "email", "city", "state", "zip"]:
            if(getattr(emp, f) in [None, "undefined", "None", ""]):
                frappe.db.set_value("Employee", emp.name, f, redis.hget(applicant_key, f))
        frappe.db.commit()
        redis.delete(applicant_id)
    except Exception as e:
        frappe.log_error(e, "JazzHR emp update")


#----------------------update single applicant---------------------#
@frappe.whitelist()
def update_single_employee(employee_number, company):
    try:
        api_key = frappe.db.get_value("Company", company, "jazzhr_api_key") or ""
        if(api_key):
            frappe.enqueue("tag_workflow.utils.jazz_integration.jazzhr_fetch_applicant_details", api_key=api_key, applicant_id=employee_number, company=company, action=2)
        else:
            frappe.msgprint(_("JazzHR api key not found in company<b>({0})</b>.").format(company))
    except Exception as e:
        frappe.log_error(e, "JazzHR emp update single employee")

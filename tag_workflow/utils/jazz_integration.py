import frappe
from frappe import _, msgprint, throw
import json, requests, time

tag_gmap_key = frappe.get_site_config().tag_gmap_key or ""

JAZZHR_API_URL="https://api.resumatorapi.com/v1/applicants/"
JAZZHR_API_KEY_PARAM = "?apikey="
GOOGLE_API_URL=f"https://maps.googleapis.com/maps/api/geocode/json?key={tag_gmap_key}&address="
JAZZHR_APPLICANT_DETAIL = "tag_workflow.utils.jazz_integration.jazzhr_fetch_applicant_details"
JAZZHR_RATE_LIMIT_CALLS = 80
JAZZHR_RATE_LIMIT_SECONDS = 40
JAZZHR_MAX_ITR = 1500

@frappe.whitelist()
def jazzhr_fetch_applicants(api_key, company, action):
    try:
        action = int(action)
        frappe.enqueue("tag_workflow.utils.jazz_integration.jazzhr_fetch_applicants_data", queue='default', timeout=1200, api_key=api_key, company=company, action=action)
    except Exception as e:
        frappe.log_error(e, "JazzHR - jazzhr_fetch_applicants fail long")

#------------JAZZHR applicants----------------------#
def jazzhr_fetch_applicants_data(api_key, company, action):
    try:
        redis = frappe.cache()
        page_no, count, fetch_applicants = 1, 0, 1
        key = "jazz_"+str(company)

        while(fetch_applicants > 0):
            if(page_no % JAZZHR_RATE_LIMIT_CALLS == 0):
                print("sleeping....")
                time.sleep(JAZZHR_RATE_LIMIT_SECONDS)

            applicants_data_url = JAZZHR_API_URL + "page/" + str(page_no) + JAZZHR_API_KEY_PARAM + api_key
            response = requests.get(applicants_data_url)
            page_no += 1

            if(response.status_code == 200 and len(response.json()) > 0):
                for a in response.json():
                    if not frappe.db.exists("Employee", {"employee_number": a['id'], "company": company}):
                        redis.hset(key, count, a['id'])
                        count += 1
            elif(len(response.json()) <= 0):
                fetch_applicants = 0

        #-------------jazzhr applicant data long queue function-------------#
        jazzhr_applicant_data(api_key, company, action)
    except Exception as e:
        frappe.log_error(e, "JazzHR - jazzhr_fetch_applicants data fail")


#---------------long queue------------------#
def jazzhr_applicant_data(api_key, company, action):
    try:
        key = "jazz_"+str(company)
        redis = frappe.cache()
        applicant_list = redis.hgetall(key)
        rng = int(len(applicant_list)/JAZZHR_MAX_ITR) + 1
        start = 0
        end = JAZZHR_MAX_ITR
        for i in range(0, rng):
            frappe.enqueue("tag_workflow.utils.jazz_integration.jazzhr_fetch_applicant_other_info", queue='long', job_name="JazzHR Long Job - "+str(i), api_key=api_key, company=company, action=action, start=start, end=end)
            start += JAZZHR_MAX_ITR
            end += JAZZHR_MAX_ITR
    except Exception as e:
        frappe.log_error(e, "JazzHR - start_log_queue")

#--------------applicant info----------------#
def jazzhr_fetch_applicant_other_info(api_key, company, action, start, end):
    try:
        redis = frappe.cache()
        key = "jazz_"+str(company)
        count, exce = 1, 1
        for i in range(start, end):
            applicant_id = redis.hget(key, i)
            try:
                # enqueue with increasing time to take care of rate limiting
                if(count % JAZZHR_RATE_LIMIT_CALLS == 0):
                    time.sleep(60)
                frappe.enqueue(JAZZHR_APPLICANT_DETAIL, timeout=900, api_key=api_key, applicant_id=applicant_id, company=company, action=action)
                count += 1
                exce = 1
                redis.hdel(key, i)
            except Exception as e:
                frappe.log_error(e, "JazzHR - jazzhr_fetch_applicant_other_info per user")
                count -= 1
                exce += 1
                if(exce <= 3):
                    continue
    except Exception as e:
        frappe.log_error(e, "JazzHR - jazzhr_fetch_applicant_other_info")


#--------------------------------------#
@frappe.whitelist()
def jazzhr_fetch_applicant_details(api_key, applicant_id, company, action):
    try:
        redis = frappe.cache()
        applicant_details_url = JAZZHR_API_URL + applicant_id + JAZZHR_API_KEY_PARAM + api_key
        response = requests.get(applicant_details_url)
        update_redis(applicant_id, company, response)

        # save to DB?
        if(action == 1):
            save_emp_to_db(applicant_id, company)
        elif(action == 2):
            update_emp_to_db(applicant_id, company)

        #delete from redis
        redis.delete(applicant_id)
    except Exception as e:
        frappe.log_error(e, "JazzHR applicant detail")

def update_redis(applicant_id, company, response):
    try:
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
            redis.hset(applicant_key, 'lat', '')
            redis.hset(applicant_key, 'lng', '')

            # fetch location data from google
            fetch_google_location_data(applicant_details, applicant_key, redis)
    except Exception as e:
        frappe.log_error(e, "JazzHR redis update")

#-------------------google data------------#
def fetch_google_location_data(applicant_details, applicant_key, redis):
    try:
        if((applicant_details['location'] and applicant_details['location']) != '(No City Provided) (No State Provided) (No Postal Code Provided)'):
            google_location_data_url = GOOGLE_API_URL + applicant_details['location']
            google_response = requests.get(google_location_data_url)
            location_data = google_response.json()
            if(google_response.status_code == 200 and len(location_data)>0 and len(location_data['results'])>0):
                city, state, zip_code, lat, lng = emp_location_data(location_data)
                redis.hset(applicant_key, 'city', city)
                redis.hset(applicant_key, 'state', state)
                redis.hset(applicant_key, 'zip', zip_code)
                redis.hset(applicant_key, 'lat', lat)
                redis.hset(applicant_key, 'lng', lng)
    except Exception as e:
        frappe.log_error(e, "JazzHR Google Data")


def emp_location_data(address_dt):
    try:
        city, state, zip_code, lat, lng = '', '', 0, '', ''
        state_data = address_dt['results'][0]['address_components']
        for i in state_data:
            if 'administrative_area_level_1' in i['types']:
                state = i['long_name'] if i['long_name'] else ''
            elif 'postal_code' in i['types']:
                zip_code = int(i['long_name']) if i['long_name'].isdigit() else 0

        city_zip = address_dt['results'][0]['formatted_address'].split(',')
        city = city_zip[-3].strip() if len(city_zip)>2 and city_zip[-3].strip() else ''

        if(len(address_dt['results']) > 0):
            location = address_dt['results'][0]['geometry']['location']
            lat = location['lat']
            lng = location['lng']

        return city, state, zip_code, lat, lng
    except Exception as e:
        #frappe.msgprint('Some Error Occured while fetching address')
        frappe.log_error(e, "JazzHR address")
        return '', '', 0, '', ''


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
            emp.lat = redis.hget(applicant_key, 'lat')
            emp.lng = redis.hget(applicant_key, 'lng')
            emp.save(ignore_permissions=True)
    except Exception as e:
        #frappe.msgprint('Some Error Occured')
        frappe.log_error(e, "JazzHR emp save")

#--------------------------update emp records------------------#
@frappe.whitelist()
def jazzhr_update_applicants(api_key, company, action):
    try:
        emp_list = frappe.db.sql(""" select name, employee_number from `tabEmployee` where company = %s and employee_number IS NOT NULL and (first_name IN(NULL, "undefined", "None", "") or last_name IN(NULL, "unavailable", "None", "") or employee_gender IN(NULL, "undefined", "None", "") or contact_number IN(NULL, "undefined", "None", "") or employee_gender IN(NULL, "undefined", "None", "") or street_address IN(NULL, "undefined", "None", "") or email IN(NULL, "undefined", "None", "") or city IN(NULL, "undefined", "None", "") or state IN(NULL, "undefined", "None", "") or zip = 0 or lat IN(NULL, "undefined", "None", "") or lng IN(NULL, "undefined", "None", "")) """,company, as_dict=1)
        #print(len(emp_list), emp_list)
        count = 1
        exce = 1
        for e in emp_list:
            try:
                if(count % JAZZHR_RATE_LIMIT_CALLS == 0):
                    time.sleep(JAZZHR_RATE_LIMIT_SECONDS)
                frappe.enqueue(JAZZHR_APPLICANT_DETAIL, api_key=api_key,applicant_id=e['employee_number'],company=company,action=int(action))
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
        for f in ["first_name", "last_name", "contact_number", "employee_gender", "street_address", "email", "city", "state", "zip", "lat", "lng"]:
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
            frappe.enqueue(JAZZHR_APPLICANT_DETAIL, api_key=api_key, applicant_id=employee_number, company=company, action=2)
        else:
            frappe.msgprint(_("JazzHR api key not found in company<b>({0})</b>.").format(company))
    except Exception as e:
        frappe.log_error(e, "JazzHR emp update single employee")

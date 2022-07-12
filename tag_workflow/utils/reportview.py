import frappe
from frappe import _
from frappe.desk.reportview import get_list, get_count, execute, get_form_params, validate_args, validate_fields, validate_filters, setup_group_by, raise_invalid_field, is_standard, extract_fieldname, get_meta_and_docfield, update_wildcard_field_param, clean_params, parse_json, get_parenttype_and_fieldname, compress, save_report, export_query, append_totals_row, get_labels, handle_duration_fieldtype_values, delete_items, delete_bulk, get_sidebar_stats, get_stats, get_filter_dashboard_data, scrub_user_tags, get_match_cond, build_match_conditions, get_filters_cond

import frappe, json
from six.moves import range
import frappe.permissions
from frappe.model.db_query import DatabaseQuery
from frappe.model import default_fields, optional_fields
from six import string_types, StringIO
from frappe.core.doctype.access_log.access_log import make_access_log
from frappe.utils import cstr, format_duration
from frappe.model.base_document import get_controller
import googlemaps
import json, requests, time
from haversine import haversine, Unit
from tag_workflow.tag_workflow.doctype.job_order.job_order import claims_left

tag_gmap_key = frappe.get_site_config().tag_gmap_key or ""
GOOGLE_API_URL=f"https://maps.googleapis.com/maps/api/geocode/json?key={tag_gmap_key}&address="
distance_value = {"5": 5, "10": 10, "25": 25, "50": 50, "100": 100}
distance = ['5', '10', '25', '50', '100']
JOB = "Job Order"

@frappe.whitelist()
@frappe.read_only()
def get():
    try:
        args = get_form_params()
        # If virtual doctype get data from controller het_list method
        radius = args.radius
        if 'radius' in args.keys():
            del args["radius"]

        if frappe.db.get_value("DocType", filters={"name": args.doctype}, fieldname="is_virtual"):
            controller = get_controller(args.doctype)
            data = compress(controller(args.doctype).get_list(args))
        else:
            data = compress(execute(**args), args=args)
            organization_type = frappe.db.get_value("User", frappe.session.user, "organization_type") or ''
            if(args.doctype == JOB and organization_type == "Staffing"):
                data = staffing_data(data, radius)
                data = claim_left(data)
        return data
    except Exception as e:
        frappe.msgprint(e)


def staffing_data(data, radius):
    try:
        result = []
        user_company = frappe.db.get_list("Employee", {"user_id": frappe.session.user}, "company")
        if(radius in distance):
            data = get_data(user_company, radius, data)
        elif(radius != 'All'):
            for d in data['values']:
                if(len(d)>3 and radius == d[-4]):
                    result.append(d)
            data["values"] = result
        return data
    except Exception as e:
        frappe.msgprint(e)
        return data

def claim_left(data):
    try:
        data_list = data
        company = frappe.db.get_value("User", frappe.session.user, "company")
        for d in data['values']:
            d[-6] = claims_left(d[0], company)
        return data
    except Exception as e:
        frappe.msgprint(e)
        return data_list


def get_data(user_company, radius, data):
    try:
        company_address = []
        for com in user_company:
            add = " ".join(frappe.db.get_value("Company", com.company, ["IFNULL(suite_or_apartment_no, '')", "IFNULL(state, '')", "IFNULL(city, '')", "IFNULL(zip, '')"]))
            if(add and add not in company_address):
                lat, lng = get_lat_lng(add)
                lat_lng = tuple([lat, lng])
                if(lat != 0 and lng != 0 and lat_lng not in company_address):
                    company_address.append(lat_lng)
        if(check_distance):
            data["values"] = check_distance(company_address, data, radius)
        return data
    except Exception as e:
        frappe.msgprint(e)

def check_distance(company_address, data, radius):
    try:
        result, orders = [], []
        for add in company_address:
            for d in data['values']:
                try:
                    lat, lng = frappe.db.get_value("Job Site", d[-4], ["IFNULL(lat, '')", "IFNULL(lng, '')"])
                    rds = haversine(add, tuple([float(lat), float(lng)]), unit='km')
                    if(rds <= distance_value[radius] and d[0] not in orders):
                        result.append(d)
                        orders.append(d[0])
                except Exception:
                    continue
        return result
    except Exception as e:
        frappe.msgprint(e)

@frappe.whitelist()
def get_location():
    try:
        result = []
        order = frappe.get_list(JOB, ["name", "job_site"], ignore_permissions=0)
        for o in order:
            if(o.job_site not in result):
                result.append(o.job_site)
        return result
    except Exception as e:
        print(e)
        return []


#-------------------------------#
def get_lat_lng(address):
    try:
        lat, lng = 0, 0
        google_location_data_url = GOOGLE_API_URL + address
        google_response = requests.get(google_location_data_url)
        location_data = google_response.json()
        if(google_response.status_code == 200 and len(location_data)>0 and len(location_data['results'])>0):
            location = location_data['results'][0]['geometry']['location']
            lat = location['lat']
            lng = location['lng']
        return lat, lng
    except Exception as e:
        frappe.msgprint(e)
        return 0, 0

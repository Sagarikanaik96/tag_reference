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

tag_gmap_key = frappe.get_site_config().tag_gmap_key or ""
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
        del args["radius"]

        if frappe.db.get_value("DocType", filters={"name": args.doctype}, fieldname="is_virtual"):
            controller = get_controller(args.doctype)
            data = compress(controller(args.doctype).get_list(args))
        else:
            data = compress(execute(**args), args=args)
            if(args.doctype == JOB and (frappe.db.get_value("User", frappe.session.user, "organization_type") == "Staffing")):
                data = staffing_data(data, radius)
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
                if(radius == d[-4]):
                    result.append(d)
            data["values"] = result
        return data
    except Exception as e:
        frappe.msgprint(e)
        return data


def get_data(user_company, radius, data):
    try:
        company_address = []
        for com in user_company:
            add = " ".join(frappe.db.get_value("Company", com.company, ["IFNULL(suite_or_apartment_no, '')", "IFNULL(state, '')", "IFNULL(city, '')", "IFNULL(zip, '')"]))
            if(add and add not in company_address):
                company_address.append(add)
        data["values"] = google_distance_values(data, radius, company_address)
        return data
    except Exception as e:
        frappe.msgprint(e)

def google_distance_values(data, radius, company_address):
    try:
        result, order = [], []
        gmaps = googlemaps.Client(key=tag_gmap_key)
        for add in company_address:
            for d in data['values']:
                try:
                    my_dist = gmaps.distance_matrix(add, d[-4])
                    result, order = google_distance(my_dist, d, radius, result, order)
                except Exception as e:
                    print(e)
                    continue
        return result
    except Exception as e:
        frappe.msgprint(e)
        return data["values"]

def google_distance(my_dist, d, radius, result, order):
    try:
        if(my_dist['status'] == 'OK' and my_dist['rows'][0]['elements'][0]['distance']):
            km = my_dist['rows'][0]['elements'][0]['distance']['value']/1000 or 0
            if(((km*0.62137) <= distance_value[radius] or km == 0) and d[0] not in order):
                result.append(d)
                order.append(d[0])
        return result, order
    except Exception as e:
        print(e)


@frappe.whitelist()
def get_location():
    try:
        result = []
        order = frappe.get_list(JOB, ["name", "job_site"])
        for o in order:
            if(frappe.has_permission(doctype=JOB, ptype="read", doc=o.name) and o.job_site not in result):
                result.append(o.job_site)
        return result
    except Exception as e:
        print(e)
        return []

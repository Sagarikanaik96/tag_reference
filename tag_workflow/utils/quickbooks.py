import json
import traceback
import frappe
import requests, time
from frappe import _
from requests_oauthlib import OAuth2Session
from intuitlib.client import AuthClient
from quickbooks import QuickBooks
from quickbooks.objects.base import CustomerMemo
from quickbooks.objects.customer import Customer
from quickbooks.objects.invoice import Invoice
from quickbooks.objects.item import Item
from quickbooks.objects.detailline import SalesItemLine, SalesItemLineDetail
from quickbooks.objects.account import Account


@frappe.whitelist()
def callback(*args, **kwargs):
    try:
        company_id = kwargs.get("realmId")
        if(frappe.db.exists("Company", {"quickbooks_company_id": company_id})):
            company = frappe.get_doc("Company", {"quickbooks_company_id": company_id})
            company.refresh_token = ''
            company.code = kwargs.get("code")

            oauth = OAuth2Session(client_id=company.client_id, redirect_uri=company.redirect_url, scope=company.scope)
            token = oauth.fetch_token(token_url=company.token_endpoint, client_secret=company.client_secret, code=kwargs.get("code"))
            company.access_token = token["access_token"]
            company.refresh_token = token["refresh_token"]
            company.save()
            frappe.respond_as_web_page("Quickbooks Authentication", html="<script>window.close()</script>")
        else:
            frappe.throw(_("Company does not exists"))
    except Exception as e:
        frappe.msgprint(e)


def get_access_token(comp):
    try:
        oauth = OAuth2Session(client_id=comp.client_id, redirect_uri=comp.redirect_url, scope=comp.scope)
        token = oauth.refresh_token(token_url=comp.token_endpoint, client_id=comp.client_id, refresh_token=comp.refresh_token, client_secret=comp.client_secret, code=comp.code)
        frappe.db.set_value("Company", comp.name, "access_token", token["access_token"])
        frappe.db.set_value("Company", comp.name, "refresh_token", token["refresh_token"])
        return token["access_token"]
    except Exception as e:
        print(e, "get_access_token")



#------------check if quickbook auth or not and sync invoice------------#
@frappe.whitelist()
def auth_quickbook_and_sync(company, invoice):
    try:
        result = {"authorization_url": "", "invoice_id": "", "error": ""}
        com = frappe.get_doc("Company", company)

        if(not com.client_id or not com.client_secret or not com.quickbooks_company_id):
            frappe.msgprint(_("Please add <b>Client ID</b>, <b>Client Secret</b> and <b>QuickBook Company ID</b> in <b>{0}</b> profile").format(company))
        elif(not com.refresh_token and com.authorization_url):
            result['authorization_url'] = com.authorization_url
        elif(com.refresh_token):
            invoice = frappe.get_doc("Sales Invoice", invoice)
            if(not invoice.quickbook_invoice_id):
                quickbook_id = sync_invoice(invoice)
                result['invoice_id'] = quickbook_id
                frappe.db.set_value("Sales Invoice", invoice.name, "quickbook_invoice_id", quickbook_id)
            else:
                frappe.msgprint(_("Invoice(<b>{0}</b>) already exported to QuickBooks").format(invoice.name))
        return result
    except Exception as e:
        frappe.log_error(e, "QuickBook auth")
        frappe.msgprint(e)
        result['error'] = e
        return result

#check customer in Quickbook
def check_customer(customer, client):
    try:
        customers = Customer.filter(Active=True, CompanyName=customer, qb=client)
        print(customers)
        if not customers:
            cust = Customer()
            cust.CompanyName = customer
            cust.GivenName = customer
            cust.save(qb=client)
        else:
            for c in customers:
                return c
    except Exception as e:
        frappe.log_error(e, "check_customer")
        frappe.msgprint(e)


#create invoice in quickbook
def create_invoice(invoices, client, cust, request_id=None):
    try:
        print(request_id)
        invoice = Invoice()
        for i in invoices.items:
            line_detail = SalesItemLineDetail()
            line_detail.UnitPrice = i.amount  # in dollars
            line_detail.Qty = i.qty
            print(line_detail)

            line = SalesItemLine()
            line.Amount = i.amount  # in dollars
            line.Description = i.item_name
            print(line, line.Amount)
            line.SalesItemLineDetail = line_detail

            invoice.Line = [line]

        print(cust.to_ref())
        invoice.TxnDate = str(invoices.posting_date)
        invoice.CustomerRef = cust.to_ref()
        invoice.CustomerMemo = CustomerMemo()
        invoice.CustomerMemo.value = "Thank you for your business and have a great day!"
        invoice.DocNumber = invoices.name
        invoice.save(qb=client)
        return invoice.to_dict()['Id']
    except Exception as e:
        frappe.log_error(e, "create_invoice")
        frappe.msgprint(e)

def sync_invoice(invoice):
    try:
        print(invoice.company)
        company = frappe.get_doc("Company", invoice.company)

        #fetching access token from quickbook
        access_token = get_access_token(company)
        #Setting up an AuthClient
        auth_client = AuthClient(client_id=company.client_id, client_secret=company.client_secret, access_token=access_token, environment='sandbox', redirect_uri=company.redirect_url)
        client = QuickBooks(auth_client=auth_client, refresh_token=company.refresh_token, company_id=company.quickbooks_company_id)

        #checking customer in quickbook database
        cust = check_customer(invoice.customer, client)

        #create_invoice in quickbook
        invoice_id = create_invoice(invoice, client, cust)
        return invoice_id
    except Exception as e:
        frappe.log_error(e, "sync_invoice")
        frappe.msgprint(e)

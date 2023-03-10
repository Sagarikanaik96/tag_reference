frappe.require('/assets/tag_workflow/js/staff_invoice_ratings.js');
frappe.ui.form.on("Sales Invoice", {
	onload: function(){
		if(frappe.session.user != 'Administrator'){
			$('[data-label="Get%20Items%20From"]').hide();
		}
		$('[data-fieldname="customer"]').click(function(){ return false})

		$("[data-fieldname=customer]").click(function(){
			
			let custt= cur_frm.fields_dict.customer.value
			localStorage.setItem("company",custt)
			window.location.href= "/app/dynamic_page"
		});
		setTimeout(function(){
			$('[data-label="Get%20Items%20From"]').hide();
			$('[data-label="View"]').hide();
			$('[data-label="Create"]').hide();
			$('[data-label="Fetch%20Timesheet"]').hide();
			$('.grid-footer')[0].style.display="block";
		},550)
	},
	refresh: function(frm){
		$('.form-footer').hide()
		$('[data-original-title="Menu"]').hide();
		$('[class="btn btn-primary btn-sm primary-action"]').show();
		$('.custom-actions.hidden-xs.hidden-md').show();
		setTimeout(function(){
			$('.grid-footer')[0].style.display="block";
		},550)
		hide_fields_data(frm)
		cur_frm.clear_custom_buttons();
		let is_table = '';
		let invoice_field = ["naming_series", "is_return", "is_debit_note", "accounting_dimensions_section", "customer_po_details", "address_and_contact", "currency_and_price_list", "update_stock", "sec_warehouse", "pricing_rule_details", "packing_list", "taxes_section", "section_break_40", "sec_tax_breakup", "section_break_43", "loyalty_points_redemption", "column_break4", "advances_section", "payment_terms_template", "terms_section_break", "transporter_info", "edit_printing_settings", "gst_section", "more_information", "more_info", "sales_team_section_break", "subscription_section", "einvoice_section", "section_break2", "ewaybill", "disable_rounded_total", "total_advance", "rounded_total", "rounding_adjustment", "pos_profile", "payments_section", "section_break_88"];
		hide_fields(invoice_field, is_table);
		go_joborder_list(frm);
		tag_field_hide(frm);
		if(frm.doc.__islocal==1){
			cancel_salesinvoice(frm);
		}
		$('[data-label="Save"]').show();
		check_staffing_reviews_invoice_page(frm)
		setTimeout(function(){
			$('[data-label="View"]').hide();
			$('[data-label="Get%20Items%20From"]').hide();
			$('[data-label="Create"]').hide();
			$('[data-label="Fetch%20Timesheet"]').hide();


		},250)

		$('[data-fieldname="company"]').click(function(){ return false})
		$('[data-fieldname="company"]').click(function(){
			
			if (frm.doc.company){
				localStorage.setItem("company", frm.doc.company);
				window.location.href="/app/dynamic_page";
			}
		});
		let child_table=['item_code','qty','rate','amount','activity_type','description','from_time','to_time','billing_hours','billing_amount','sales_invoice_id','job_order_id','total_amount','payment_term','description','due_date','invoice_portion','payment_amount'];
		for(let i in child_table){
			$( "[data-fieldname="+child_table[i]+"]" ).on('mouseover',function(e) {
				let file=e.target.innerText;
				$(this).attr('title', file);
			});
		}
		$('[data-label="Save"]').show();
        sync_with_quickbook(frm);
		$('[data-original-title="Printer"]').off('click');
		$('[data-original-title="Printer"]').on('click', ()=>{
			frappe.set_route("print-invoice", "Sales Invoice", frm.doc.name);
		});
	},
	on_submit: function(frm) {
		if(frm.doc.docstatus ==1){
			frappe.call({
				"method":"tag_workflow.tag_data.sales_invoice_notification",
				"freeze": true,
				"freeze_message": "<p><b>preparing notification for hiring orgs...</b></p>",
				"args":{
					"user": frappe.session.user,
					"sid": frappe.boot.tag.tag_user_info.sid,
					"job_order":frm.doc.job_order,
					"company":frm.doc.company,
					"invoice_name":frm.doc.name
				}
			});

			let table = frm.doc.timesheets || [];

			if(table){
				frappe.call({
					"method":"tag_workflow.tag_data.update_timesheet_is_check_in_sales_invoice",
					"args":{
						"time_list":table,
						"timesheet_used":frm.doc.timesheet_used
					}
				});
			}
		}
	},
	before_save: function(frm){
		cur_frm.set_value("taxes_and_charges", "");
		cur_frm.clear_table("taxes");
		let item = frm.doc.items || [];
		for(let i in item){
			frappe.model.set_value(item[i].doctype, item[i].name, "item_code", "")
		}
		update_payment(frm);
		update_default_values(frm)
	},
	is_pos: function(frm){
		if(frappe.user_roles.includes("System Manager")){
			update_payment(frm);
		}else{
			check_timesheet(frm);
		}
	},

    posting_date: function(frm){
        if(frm.doc.posting_date){
            cur_frm.clear_table("payment_schedule");
            cur_frm.refresh_field("payment_schedule");
            let due_date = frappe.datetime.add_days(cur_frm.doc.posting_date, 30);
            cur_frm.set_value("due_date", due_date);
        }
    },
    due_date: function(frm){
        cur_frm.clear_table("payment_schedule");
        cur_frm.refresh_field("payment_schedule");
    }
});


/*---------make field hidden-------------*/
function hide_fields(fields, child){
	if(!child){
		for(let val in fields){
			cur_frm.toggle_display(fields[val], 0);
		}
	}else{
		for(let val in fields){
			cur_frm.fields_dict["items"].grid.grid_rows_by_docname[child.name].toggle_display(fields[val], 0);
		}
	}
}


/*----------invoice table---------------*/
frappe.ui.form.on("Sales Invoice Item", {
	form_render: function(_frm, cdt, cdn){
		let child = frappe.get_doc(cdt, cdn);
		let table_fields = ["base_rate", "base_net_rate", "base_net_amount", "base_amount", "net_amount", "net_rate", "base_price_list_rate", "item_tax_template", "item_weight_details", "against_blanket_order", "image_section", "item_balance", "shopping_cart_section", "section_break_43", "reference", "manufacturing_section_section", "planning_section", "shopping_cart_section", "section_break_63", "drop_ship_section", "billed_amt", "valuation_rate", "gross_profit", "stock_uom", "conversion_factor", "stock_qty", "incoming_rate", "drop_ship", "deferred_revenue", "section_break_18", "edit_references", "margin_type", "margin_rate_or_amount", "rate_with_margin", "accounting_dimensions_section", "section_break_54", "warehouse_and_reference", "accounting", "drop_ship", "discount_and_margin", "is_free_item", "gst_hsn_code", "is_nil_exempt", "is_non_gst"];
		hide_fields(table_fields, child);
	}
});


/*----------payments-----------*/
function check_timesheet(frm){
	if(frm.doc.is_pos){
		frappe.call({
			"method": "tag_workflow.utils.whitelisted.check_timesheet",
			"args":  {"job_order": frm.doc.job_order},
			"callback": function(r){
				let data = r.message;
				if(!data){
					cur_frm.set_value("is_pos", 0);
					cur_frm.clear_table("payments");
					cur_frm.refresh_field("payments");
				}else{
					update_payment(frm);
				}
			}
		});
	}else{
		cur_frm.clear_table("payments");
		cur_frm.refresh_field("payments");
	}
}

function update_payment(frm){
	if(frm.doc.is_pos){
		if(frm.doc.payments.length <= 0){
			let child = frappe.model.get_new_doc("Sales Invoice Payment", cur_frm.doc, "payments");
			$.extend(child, {
				"mode_of_payment": "Cash",
				"amount": cur_frm.doc.grand_total
			});
		}else{
			cur_frm.doc.payments[0].amount = cur_frm.doc.grand_total;
		}
	}else{
		cur_frm.clear_table("payments");
		cur_frm.refresh_field("payments");
	}
}

function update_default_values(frm){
	frappe.db.get_value("Company",frm.doc.company,'abbr',(s)=>{
		if(!frm.doc.debit_to){
		frappe.db.get_value("Company",frm.doc.company,'default_receivable_account',(d)=>{
			if(!d.default_receivable_account){
				let account="1310 - Debtors - "+s.abbr
				 frappe.call({
										async: false,
										"method": "frappe.client.set_value",
										"args": {
											"doctype": "Company",
											"name": frm.doc.company,
											"fieldname": "default_receivable_account",
											"value":account
										}
									});
									frm.set_value('debit_to',account)
			}
			
		})
		}
		frm.doc.items.forEach(function(item){
			if(!item.income_account){
			frappe.db.get_value("Company",frm.doc.company,'default_income_account',(d)=>{
			if(!d.default_income_account){
				let account2="4110 - Sales - "+s.abbr
				 frappe.call({
										async: false,
										"method": "frappe.client.set_value",
										"args": {
											"doctype": "Company",
											"name": frm.doc.company,
											"fieldname": "default_income_account",
											"value":account2
										}
									});
				
						frm.set_value('income_account',account2)
				   
			}
			})
			}
		})
		frm.doc.items.forEach(function(item){
			if(!item.cost_center){
			frappe.db.get_value("Company",frm.doc.company,'cost_center',(d)=>{
			cost_center_val_update(d,s,frm);
		})
			}
		})
		
	})
}

function cost_center_val_update(d,s,frm) {
	if(!d.cost_center) {
		let accountc="Main - "+s.abbr;
		frappe.call({
			async: false,
			"method": "frappe.client.set_value",
			"args": {
				"doctype": "Company",
				"name": frm.doc.company,
				"fieldname": "cost_center",
				"value": accountc
			}
		});
		frm.set_value('cost_center',accountc);
	}
}

function go_joborder_list(frm){
	frm.add_custom_button(__('Go To Job Order List'), function(){
		frappe.set_route("List", "Job Order")
	}).addClass("btn-primary");
}

function tag_field_hide(frm){
	if (frm.doc.month && frm.doc.year && frappe.boot.tag.tag_user_info.company == 'tag'){
		let fields = ['total_billing_amount','total_billing_hours']
		for (let value in fields){
			cur_frm.toggle_display(fields[value],0)
		}
	}
}
function cancel_salesinvoice(frm){
	frm.add_custom_button(__('Cancel'), function(){
		frappe.set_route("Form", "Sales Invoice");
	});
}

/*--------------------QuickBooks Export------------------*/
function sync_with_quickbook(frm){
    let roles = frappe.user_roles || [];
    if(!frm.doc.quickbook_invoice_id && frm.doc.docstatus == 1 && ((roles.includes("Staffing Admin") || roles.includes("Staffing User")) || (roles.includes("Tag User") || roles.includes("Tag Admin")))){
		frappe.db.get_value("Company", {"name": frm.doc.company}, ["client_id", "client_secret", "quickbooks_company_id"], function(r){
			if(r.client_id && r.client_secret && r.quickbooks_company_id){
				frm.add_custom_button(__("Export to QuickBooks"), function(){
					insert_update_quickbook_invoice(frm);
				}).addClass("btn-primary");
			}
		});
	}else if(frm.doc.quickbook_invoice_id){
        cur_frm.dashboard.set_headline(__(`<div style="display: flex;flex-direction: inherit;"><p>This Invoice was successfully exported to QuickBooks with quickbooks id: <b>${frm.doc.quickbook_invoice_id}</b></p></div>`));
    }
}

function insert_update_quickbook_invoice(frm){
	frappe.call({
		"method": "tag_workflow.utils.quickbooks.auth_quickbook_and_sync",
		"args": {"company": frm.doc.company, "invoice": frm.doc.name},
		"freeze": true,
		"freeze_message": "<p><b>Exporting to QuickBooks...</b></p>",
		"callback": function(r){
			let data = r.message;
			if(data.authorization_url){
				frappe.msgprint("Please Authenticate yourself before Migrating Data to Quickbook. We are now redirecting you to the Authentication page");
				sleep(1500).then(() => {
					window.open(data.authorization_url);
				});
			}else if(data.invoice_id && !frm.doc.quickbook_invoice_id){
				frappe.msgprint("Invoice <b>"+frm.doc.name+"</b> successfully exported to QuickBooks.");
				cur_frm.reload_doc();
			}else if(data.invoice_id && frm.doc.quickbook_invoice_id){
				frappe.msgprint("Invoice <b>"+frm.doc.name+"</b> successfully updated in QuickBooks.");
			}else if(data.error && !frm.doc.quickbook_invoice_id){
				frappe.msgprint("Invoice <b>"+frm.doc.name+"</b> failed to export with the following error: "+data.error+".");
			}else if(data.error && frm.doc.quickbook_invoice_id){
				frappe.msgprint("Invoice <b>"+frm.doc.name+"</b> failed to update with the following error: "+data.error+".");
			}
		}
	});
}

// sleep time expects milliseconds
function sleep (time) {
        return new Promise((resolve) => setTimeout(resolve, time));
}

function hide_fields_data(frm){
    let myStringArray = ["patient", "ref_practitioner"];
        let arrayLength = myStringArray.length;
        for (let i = 0; i < arrayLength; i++) {
            frm.set_df_property(myStringArray[i], "hidden", 1);
        }
}



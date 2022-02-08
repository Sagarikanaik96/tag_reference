frappe.ui.form.on("Sales Invoice", {
	refresh: function(frm){
		cur_frm.clear_custom_buttons();
		let is_table = '';
		var invoice_field = ["naming_series", "is_return", "is_debit_note", "accounting_dimensions_section", "customer_po_details", "address_and_contact", "currency_and_price_list", "update_stock", "sec_warehouse", "pricing_rule_details", "packing_list", "taxes_section", "section_break_40", "sec_tax_breakup", "section_break_43", "loyalty_points_redemption", "column_break4", "advances_section", "payment_terms_template", "terms_section_break", "transporter_info", "edit_printing_settings", "gst_section", "more_information", "more_info", "sales_team_section_break", "subscription_section", "einvoice_section", "section_break2", "ewaybill", "disable_rounded_total", "total_advance", "rounded_total", "rounding_adjustment", "pos_profile", "payments_section", "section_break_88"];
		hide_fields(frm, invoice_field, is_table);
		go_joborder_list(frm)
		tag_field_hide(frm)
		if(frm.doc.__islocal==1){
			cancel_salesinvoice(frm);
		}
	},
	on_submit: function(frm) {
		if(frm.doc.docstatus ==1){
			frappe.call({
				"method":"tag_workflow.tag_data.sales_invoice_notification",
				"freeze": true,
				"freeze_message": "<p><b>preparing notification for hiring orgs...</b></p>",
				"args":{
					"job_order":frm.doc.job_order,
					"company":frm.doc.company,
					"invoice_name":frm.doc.name
				}
			})
		let table = frm.doc.timesheets
		frappe.call({
			"method":"tag_workflow.tag_data.update_timesheet_is_check_in_sales_invoice",
			"args":{
				"time_list":table
				}
			});
		}
	},
	before_save: function(frm){
		cur_frm.set_value("taxes_and_charges", "");
		cur_frm.clear_table("taxes");
		update_payment(frm);
	},
	is_pos: function(frm){
		if(frappe.user_roles.includes("System Manager")){
			update_payment(frm);
		}else{
			check_timesheet(frm);
		}
	}
});


/*---------make field hidden-------------*/
function hide_fields(frm, fields, child){
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
	form_render: function(frm, cdt, cdn){
		var child = frappe.get_doc(cdt, cdn);
		var table_fields = ["base_rate", "base_net_rate", "base_net_amount", "base_amount", "net_amount", "net_rate", "base_price_list_rate", "item_tax_template", "item_weight_details", "against_blanket_order", "image_section", "item_balance", "shopping_cart_section", "section_break_43", "reference", "manufacturing_section_section", "planning_section", "shopping_cart_section", "section_break_63", "drop_ship_section", "billed_amt", "valuation_rate", "gross_profit", "stock_uom", "conversion_factor", "stock_qty", "incoming_rate", "drop_ship", "deferred_revenue", "section_break_18", "edit_references", "margin_type", "margin_rate_or_amount", "rate_with_margin", "accounting_dimensions_section", "section_break_54", "warehouse_and_reference", "accounting", "drop_ship", "discount_and_margin", "is_free_item", "gst_hsn_code", "is_nil_exempt", "is_non_gst"];
		hide_fields(frm, table_fields, child);
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


function go_joborder_list(frm){
	frm.add_custom_button(__('Go Job Order List'), function(){
		frappe.set_route("List", "Job Order")
	}).addClass("btn-primary");
}

function tag_field_hide(frm){
	if (frm.doc.month && frm.doc.year && frappe.boot.tag.tag_user_info.company == 'tag'){
		let fields = ['total_billing_amount','total_billing_hours']
		for (var value in fields){
			cur_frm.toggle_display(fields[value],0)
		}
	}
}
function cancel_salesinvoice(frm){
	frm.add_custom_button(__('Cancel'), function(){
		frappe.set_route("Form", "Sales Invoice");
	});
}
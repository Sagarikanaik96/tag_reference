frappe.ui.form.on("Sales Invoice", {
	refresh: function(frm){
		let is_table = '';
		var invoice_field = ["naming_series", "is_pos", "is_return", "is_debit_note", "accounting_dimensions_section", "customer_po_details", "address_and_contact", "currency_and_price_list", "update_stock", "sec_warehouse", "pricing_rule_details", "packing_list", "taxes_section", "section_break_40", "sec_tax_breakup", "section_break_43", "loyalty_points_redemption", "column_break4", "advances_section", "payment_terms_template", "payments_section", "section_break_84", "terms_section_break", "transporter_info", "edit_printing_settings", "gst_section", "more_information", "more_info", "sales_team_section_break", "subscription_section", "einvoice_section", "section_break2", "ewaybill", "disable_rounded_total", "total_advance", "rounded_total", "rounding_adjustment"];
		hide_fields(frm, invoice_field, is_table);
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

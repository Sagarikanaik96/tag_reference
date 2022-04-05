frappe.ui.form.on("Item", {
	refresh: function(frm){
		cur_frm.clear_custom_buttons();
		setup_data(frm);
		hide_fields(frm);
		$('[data-fieldname="company"]').css("display",'block');
		$('[class="btn btn-primary btn-sm primary-action"]').show();
		$('.custom-actions.hidden-xs.hidden-md').show();
	},

	before_save: function(frm){
		frappe.call({"method": "tag_workflow.controllers.master_controller.check_item_group"});
		

		frappe.call({
			"method": "tag_workflow.utils.doctype_method.checkingitemcode",
			"args": {"item_code": frm.doc.job_title,

					},
			"async": 0,
			"callback": function(r){
				frm.set_value("item_code", r.message);
				cur_frm.refresh_field("item_code");
			}
		});

	},
	after_save: function(frm){
			frappe.call({
				method: "tag_workflow.tag_data.update_jobtitle",
				args: {company: frm.doc.company,
					job_title:frm.doc.job_title,
					description:frm.doc.descriptions,
					price:frm.doc.rate,
					name:frm.doc.name,
					job_title_id: frm.doc.job_title_id,
				},
			});
			setTimeout(function(){
   				location.reload();
   			}, 350);

		
	},

});

/*--------setup values-----------*/
function setup_data(frm){
	if(cur_frm.doc.__islocal == 1){
		var item_data = {"item_group": "Services", "is_stock_item": 0, "include_item_in_manufacturing": 0, "stock_uom": "Nos"};
		var keys = Object.keys(item_data);
		for(var val in keys){
			cur_frm.set_value(keys[val], item_data[keys[val]]);
		}
	}
}

/*-------hide fields------------*/
function hide_fields(frm){
	var fields = ["gst_hsn_code","is_nil_exempt","is_non_gst","is_item_from_hub","allow_alternative_item","is_stock_item","include_item_in_manufacturing","opening_stock","valuation_rate","standard_rate","is_fixed_asset","auto_create_assets","asset_category","asset_naming_series","over_delivery_receipt_allowance","over_billing_allowance","image","brand","sb_barcodes","inventory_section","reorder_section","unit_of_measure_conversion","serial_nos_and_batches","variants_section","defaults","purchase_details","supplier_details","foreign_trade_details","sales_details","deferred_revenue","deferred_expense_section","customer_details","item_tax_section_break","inspection_criteria","manufacturing","hub_publishing_sb","more_information_section","stock_uom",'item_group','item_code','disabled','item_name','description'];
	for(var field in fields){
		cur_frm.toggle_display(fields[field], 0);
	}
}

frappe.ui.form.on("Item", {
	refresh: function(frm){
		cur_frm.clear_custom_buttons();
		setup_data();
		hide_connections(frm);

		hide_fields();
		$('[data-fieldname="company"]').css("display",'block');
		$('[class="btn btn-primary btn-sm primary-action"]').show();
		$('.custom-actions.hidden-xs.hidden-md').show();
		if(frm.doc.__islocal==1){
			let len_history = frappe.route_history.length;
			if(frappe.route_history.length>1 && frappe.route_history[len_history-2][1]=='Company'){
				frm.set_value('company',frappe.route_history[len_history-2][2]);
				frm.set_df_property('company', 'read_only', 1);
			}
			else if(frappe.route_history.length>1 && frappe.route_history[len_history-2][1]=='Contract'){
				frm.set_df_property('company', 'read_only', 1);
			} 
		}
		$('[data-fieldname="job_titless"]').css("display", "block");
	},

	before_save: function(frm){
		frm.set_value("item_code", frm.doc.job_titless);
		frappe.call({"method": "tag_workflow.controllers.master_controller.check_item_group"});
		
	},

	validate: function (frm) {
		if (frm.doc.__islocal) {
			if (frm.doc.job_titless.indexOf('-') > 0){
				frm.set_value("job_titless_name",frm.doc.job_titless.split('-')[0]);
			}else{
				frm.set_value("job_titless_name",frm.doc.job_titless);
			}
			cur_frm.refresh_field("job_titless_name");

			frappe.call({
				"method": "tag_workflow.tag_data.checkingjobtitleandcompany",
				"args": {"job_titless": frm.doc.job_titless_name,
						"company": frm.doc.company
						},
				"async": 0,
				"callback": function(r){
					if (!(r.message)){
						frappe.msgprint({
					        message: __("job title name already exists for this organization"),
					        title: __("Error"),
					        indicator: "orange",
					      });
						frappe.validated = false
					}
				}
			})
			frappe.call({
				"method": "tag_workflow.utils.doctype_method.checkingjobtitle_name",
				"args": {"job_titless": frm.doc.job_titless,

						},
				"async": 0,
				"callback": function(r){
					frm.set_value("job_titless", r.message);
					cur_frm.refresh_field("job_titless");
				}
			});
		}
		frm.set_value("item_code", frm.doc.job_titless);
	}

});

/*--------setup values-----------*/
function setup_data(){
	if(cur_frm.doc.__islocal == 1){
		var item_data = {"item_group": "Services", "is_stock_item": 0, "include_item_in_manufacturing": 0, "stock_uom": "Nos"};
		var keys = Object.keys(item_data);
		for(var val in keys){
			cur_frm.set_value(keys[val], item_data[keys[val]]);
		}
	}
}

/*-------hide fields------------*/
function hide_fields(){
	var fields = ["gst_hsn_code","is_nil_exempt","is_non_gst","is_item_from_hub","allow_alternative_item","is_stock_item","include_item_in_manufacturing","opening_stock","valuation_rate","standard_rate","is_fixed_asset","auto_create_assets","asset_category","asset_naming_series","over_delivery_receipt_allowance","over_billing_allowance","image","brand","sb_barcodes","inventory_section","reorder_section","unit_of_measure_conversion","serial_nos_and_batches","variants_section","defaults","purchase_details","supplier_details","foreign_trade_details","sales_details","deferred_revenue","deferred_expense_section","customer_details","item_tax_section_break","inspection_criteria","manufacturing","hub_publishing_sb","more_information_section","stock_uom",'item_group','item_code','disabled','item_name','description'];
	for(var field in fields){
		cur_frm.toggle_display(fields[field], 0);
	}
}

function hide_connections(frm){
	frm.dashboard.hide();
}
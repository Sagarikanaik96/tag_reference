frappe.ui.form.on("Company", {
	refresh: function(frm){
		let fields = ["default_letter_head","default_holiday_list","default_finance_book","default_selling_terms","default_buying_terms","default_warehouse_for_sales_return","default_in_transit_warehouse","create_chart_of_accounts_based_on","chart_of_accounts","existing_company","tax_id","date_of_establishment","sales_settings","default_settings","section_break_22","auto_accounting_for_stock_settings","fixed_asset_defaults","non_profit_section","hra_section","budget_detail","company_logo","date_of_incorporation","address_html","date_of_commencement","fax","website","company_description","registration_info"];
		hide_details(fields, 0);

		if(frappe.user_roles.includes("System Manager")){
			cur_frm.toggle_display("organization_type", 1);
		}else{
			if(cur_frm.doc.__islocal == 1){
				cur_frm.toggle_display("organization_type", 1);
			}else{
				cur_frm.toggle_display("organization_type", 0);
			}
		}
	},
	setup: function(frm){
		frm.set_query("organization_type", function(doc){
			if(frappe.user_roles.includes('Tag Admin')){
				return {
					filters: [
						["Organization Type", "name", "not in", ["Exclusive Hiring", "TAG"]]
					]
				}
			}else if(frappe.user_roles.includes('Staffing Admin')){
				return {
					filters: [
						["Organization Type", "name", "=", "Exclusive Hiring"]
					]
				}
			}else if(frappe.user_roles.includes('Hiring Admin')){
				return {
					filters: [
						["Organization Type", "name", "=", "Hiring"]
					]
				}
			}
		});
	},

	after_save: function(frm){
		frappe.call({"method": "tag_workflow.controllers.master_controller.make_update_comp_perm","args": {"docname": frm.doc.name}});
	}
});


/*---------hide details----------*/
function hide_details(fields, value){
	for(let data in fields){
		cur_frm.toggle_display(fields[data], value);
	}
}

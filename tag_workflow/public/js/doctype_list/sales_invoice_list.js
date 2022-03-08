frappe.listview_settings['Sales Invoice'] = {
	onload:function(listview){
		$('h3[title = "Invoice"]').html('Invoices');
		if(frappe.session.user!='Administrator'){
			// $('.custom-actions.hidden-xs.hidden-md').hide()
			$('[data-original-title="Refresh"]').hide()
			$('.menu-btn-group').hide()
        }
		if (frappe.boot.tag.tag_user_info.company_type == 'TAG'){
			listview.page.add_button(__("Create monthly Invoice"), function() {
				create_monthly_invoice(listview)
			}).addClass("btn-primary");
		}
	},
	refresh:function(listview){
		$('#navbar-breadcrumbs > li > a').html('Invoices');
		$('[class="btn btn-primary btn-sm primary-action"]').hide();
		$('[class="btn btn-default btn-sm ellipsis"]').hide();
		$('button.btn.btn-primary.btn-sm.btn-new-doc.hidden-xs').hide();
	},
	hide_name_column: true,
	// add_fields: ['type', 'reference_doctype', 'reference_name'],
	button: {
		show: function(doc) {
			return doc.name;
		},
		get_label: function() {
			return __('View Invoice');
		},
		get_description: function(doc) {
			return __('Open {0}', [`"Sales Invoice" ${doc.name}`]);
		},
		action: function(doc) {
			frappe.set_route('print', "Sales Invoice", doc.name);
		}
	}
};


function create_monthly_invoice(listview){
		var pop_up = new frappe.ui.Dialog({
			title: __('Monthly Staffing Sales Invoice'),
			'fields': [
				{
					"fieldname":"year",
					"label": __("Start Year"),
					"fieldtype": "Select",
					"options": year_list(cur_dialog),
					"reqd": 1,
					"default": new Date().getUTCFullYear(),
					onchange:function(){
						month_list(cur_dialog)
					}
		
				},
				{
					"fieldname":"month",
					"label":"Month",
					"fieldtype": "Select",
					"options":current_month_year(cur_dialog),
					"width":"80",
					"default": "January",
					"reqd": 1,
					
				},
				{
					'fieldname': 'company',
					'fieldtype': 'Select',
					'options':get_staffing_company_list(),
					'label':'staffing company',
					"reqd": 1,
					onchange:function(){
						tag_staffing_charges(cur_dialog)
					}
				},
				{
					'fieldname': 'tag_charges',
					'fieldtype': 'Data',
					'label':'Tag Charges',
					'read_only':1,
					"depends_on": "eval: doc.company",
				}

			],
			primary_action: function(){
				pop_up.hide();
				var staff_detail=pop_up.get_values()
				frappe.call({
					method: "tag_workflow.utils.invoice.make_month_invoice",
					freeze: true,
					freeze_message: "<p><b>Creating Monthly invoice ....</b></p>",
					args:{
						frm: staff_detail
					},
					callback:function(rm){
						if (rm.message){
							frappe.show_alert({message:__('Monthly Invoive created Succesfully'),indicator:'green'}, 5);

						}	
					}
				})
			}
		});
		pop_up.show();

}


function month_list(dialog){
	let year = parseInt(dialog.get_value("year"));
	let current_year = new Date().getUTCFullYear()

	if (year > current_year){
		frappe.msgprint('future year is not accepted')
		cur_dialog.set_value("year",current_year)
		var op = current_month_year(dialog)
		dialog.set_df_property("month", "options", op);

	}
	else if(year < current_year){
		var options1 = 'January\nFebruary\nMarch\nApril\nMay\nJune\nJuly\nAugust\nSeptember\nOctober\nNovember\nDecember'
		dialog.set_df_property("month", "options", options1);
	}
	else{
		var month = current_month_year(dialog)
		dialog.set_df_property("month", "options", month);
	}
	
}

function tag_staffing_charges(dialog){
	let company = dialog.get_value("company");
	if (company){
	frappe.db.get_value("Company", {"name": company }, ["tag_charges"], function(r){
		if (r.tag_charges){
			cur_dialog.set_value("tag_charges",r.tag_charges)
		}

	});
}
}

function current_month_year(dialog){
	let months = ['January','February','March','April','May','June','July','August','September','October','November','December']
	let options='January';

	let cur_month = new Date().getMonth()

	for (let i = 1;i <= cur_month;i++){
		options += '\n'+ months[i]

	}
	return options
}

function  year_list(cur_dialog){
		let year_opt = '2021'
		let start_year = 2021
		let current_year = new Date().getUTCFullYear()

		for (let i = start_year +1;i <=current_year;i++){
			year_opt += '\n' + i
		}
	return year_opt
}


function get_staffing_company_list(){
	let company = '';
	frappe.call({
		"method": "tag_workflow.utils.whitelisted.get_staffing_company_list",
		"args": {"company_type": "Hiring"},
		"async": 0,
		"callback": function(r){
			company += r.message;
		}
	});
	return company
}
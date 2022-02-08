frappe.listview_settings['Sales Invoice'] = {
	refresh:function(listview){
		$('.btn-primary').hide();
		$('button.btn.btn-primary.btn-sm.btn-new-doc.hidden-xs').hide();
	},
	onload:function(listview){
	if (frappe.boot.tag.tag_user_info.company == 'tag'){
		listview.page.add_button(__("Create monthly Invoice"), function() {
			create_monthly_invoice(listview)
			}).addClass("btn-primary");
		}
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
			title: __('Monthly Staffing Report'),
			'fields': [
				{
					"fieldname":"month",
					"label":"Month",
					"fieldtype": "Select",
					"options":'January\nFebruary\nMarch\nApril\nMay\nJune\nJuly\nAugust\nSeptember\nOctober\nNovember\nDecember',
					"width":"80",
					"default": "January",
					"reqd": 1,
					
				},
				{
					"fieldname":"year",
					"label": __("Start Year"),
					"fieldtype": "Select",
					"options": "2021\n2022\n2023\n2024",
					"reqd": 1,
					"default": '2022'
		
				},
				{
					'fieldname': 'company',
					'fieldtype': 'Select',
					'options':get_staffing_company_list(),
					'label':'staffing company',
					"reqd": 1,
				}

			],
			primary_action: function(){
				pop_up.hide();
				var staff_detail=pop_up.get_values()
				frappe.call({
					method: "tag_workflow.utils.invoice.make_month_invoice",
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



function get_staffing_company_list(){
	let company = '\n';
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
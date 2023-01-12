frappe.ui.form.on("Item", {
	onload: function(frm){frm.fields_dict['job_site_table'].grid.get_field('job_site').get_query = function (doc,cdt,cdn) {
			let jobsites = frm.doc.job_site_table, site_list = [];
			for (let t in jobsites){
				if(jobsites[t]['job_site']){
					site_list.push(jobsites[t]['job_site']);
				}
			}
			return{
				query: "tag_workflow.tag_workflow.doctype.job_site.job_site.get_sites_based_on_company",
				filters: {
				company:frm.doc.company,
				site_list:site_list
				},
			}
			
	};},
	refresh: function(frm,cdt,cdn){
		frm.set_value('job_titless_name', frm.doc.job_titless);
		if(frm.doc.__islocal!=1){
			frm.set_df_property('job_titless_name', 'read_only', 1);
		}
		// $("#item-details > div:nth-child(1) > div > div:nth-child(2) > form > div:nth-child(3) > div > div.control-input-wrapper > div.control-input > input").html("$ 0.00")
		$('.form-footer').hide();
		cur_frm.clear_custom_buttons();
		hide_connections(frm);
		hide_fields();
		read_only_company_field(frm);
		frm.fields_dict['pay_rate'].grid.wrapper.find('.grid-remove-rows').hide()
		$('[data-fieldname="company"]').css("display",'block');
		$('[class="btn btn-primary btn-sm primary-action"]').show();
		$('.custom-actions.hidden-xs.hidden-md').show();
		set_staffing_data();
		set_hiring_data();
		set_job_site_disable_enable(cdt,cdn);
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
		
		frm.set_df_property('job_titless', 'hidden', 0);
		if(frappe.boot.tag.tag_user_info.company_type != 'TAG' && frappe.session.user != 'Administrator'){
			frm.set_df_property('company', 'reqd', 1);
		}
		readonly_fields(frm);
		if(frm.doc.__islocal == 1){
			if (frappe.boot.tag.tag_user_info.company_type == 'TAG' || frappe.session.user == 'Administrator'){
				frm.set_value('company', '')
			}
		}
		if(frm.doc.__islocal != 1){
			Array.from($('[data-fieldtype="Currency"]')).forEach(_field =>{
				_field.id = "id_rate";
			}) 
		}
		if(cur_frm.doc.__islocal==1){
			Array.from($('[data-fieldtype="Currency"]')).forEach(_field =>{
				_field.id = "id_mvr_hour";		
			})
			
			$('div.row:nth-child(16) > div:nth-child(2) > div:nth-child(2) > form:nth-child(1) > div:nth-child(8) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1)').attr('id', 'id_mvr_hour');
		}
		frm.fields_dict['pay_rate'].grid.wrapper.find('.grid-add-row').click(function() {
			set_job_site_disable_enable(cdt,cdn);
		})
		
	},
	before_save: function(frm,cdt,cdn){
		frm.set_value("item_code", frm.doc.job_titless);
		cur_frm.set_value('item_group','All Item Groups')
		cur_frm.set_value('stock_uom','Nos')
		frappe.call({"method": "tag_workflow.controllers.master_controller.check_item_group"});
		let items = locals[cdt][cdn]; 
		{ $.each(frm.doc.pay_rate || [], function(i, v) {
				if(v.staffing_company == undefined || v.staffing_company.length == 0){
					v.employee_pay_rate = 0.00
					v.hiring_company = ""
					v.site = ""
				}
				else if(v.staffing_company.length != 0){
					if( v.hiring_company == undefined || v.hiring_company.length == 0){
						if(v.employee_pay_rate == 0 || v.employee_pay_rate == undefined){
							v.employee_pay_rate  = items.rate
						}
					}
				}
			})
		}
		frm.refresh_field('pay_rate')
	},
	validate: function (frm) {
		if (frm.doc.__islocal && frm.doc.job_titless) {
			if (frm.doc.job_titless.indexOf('-') > 0){
				frm.set_value("job_titless",frm.doc.job_titless.split('-')[0]);
			}else{
				frm.set_value("job_titless",frm.doc.job_titless);
			}
			cur_frm.refresh_field("job_titless");

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
		validate_form(frm);		
	},
	company: function(frm){
		if(frm.doc.company){
			frappe.db.get_value("Item", {"name": frm.doc.name}, "company", (r) => {
				if (r!=frm.doc.company){
					frm.doc.job_site_table=[]
			frm.refresh_field("job_site_table")
				}
			});
			
		}
		if(!frm.doc.company){
			frm.set_value('company', '');
			$('[data-fieldname = "company"]').attr('title', '');
			$('[data-fieldname = "company"]>input').attr('title', '');
		}	
	},
	after_save:function(frm){
		if(frm.doc.name!=frm.doc.job_titless){
			frappe.call({
				method:"frappe.rename_doc",
				args: {
					doctype: frm.doctype,
					old: frm.docname,
					new:cur_frm.doc.job_titless	,
					merge: 0,
				},
				callback: function(r) {
					if(!r.exc) {
						$(document).trigger('rename', [frm.doctype, frm.docname,
							r.message || cur_frm.doc.job_titless]);
						if(locals[frm.doctype] && locals[frm.doctype][frm.docname])
							delete locals[frm.doctype][frm.docname];
					}
				}
			});
			frappe.call({
				method:'tag_workflow.tag_data.new_activity',
				args:{
					'activity':frm.doc.job_titless
				}
			})
		}
		if(frm.doc.company){
			frappe.call({
				method:'tag_workflow.tag_data.new_job_title_company',
				args:{
					'job_name':frm.doc.name,
					'company':frm.doc.company,
					'industry':frm.doc.industry,
					'rate':frm.doc.rate,
					'description':frm.doc.descriptions
				}
			})	

		}
		
	},	
	pay_rate_on_form_rendered:function(frm){
		frm.fields_dict['pay_rate'].grid.wrapper.find('.grid-delete-row').click(function() {
			frappe.call({
				method: "tag_workflow.utils.doctype_method.check_payrates_data", 
				args:{
					"job_industry":frm.doc.industry,
					"job_title":frm.doc.job_titless,	
				},
				callback: function(response) {
					if(response.message){
						frappe.msgprint("Already linked with job order")
						frm.reload_doc()
					}
				}
			})
		});
	},
});

frappe.ui.form.on('Job Sites', {
    job_site_table_add: function (frm, cdt, cdn) {
		let child = locals[cdt][cdn];
		child.bill_rate = frm.doc.rate
		frm.refresh_field("job_site_table")
	},
})

function set_job_site_disable_enable(cdt,cdn){
	$("[data-fieldname=" + 'hiring_company' + "]").on('click', function (e) {
		let hiring_company_data = e.target.value;
		if(hiring_company_data == undefined || hiring_company_data.length != 0){
			$("[data-fieldname=" + 'job_site' + "]").prop("disabled", true)
		}else if(hiring_company_data.length != 0){
			$("[data-fieldname=" + 'job_site' + "]").prop("disabled", false)
		}
	});
	
	$("[data-fieldname=" + 'job_site' + "]").on('click', function (e) {
		let items = locals[cdt][cdn]; 
		for(const data of items.pay_rate){
			if(data['hiring_company'] == undefined || data['hiring_company'].length == 0 ){
				$("[data-name=" + data['name'] + "]  [data-fieldname=" + 'job_site' + "]").prop("disabled", true)
			}else if(data['hiring_company'].length != 0){
				$("[data-name=" + data['name'] + "]  [data-fieldname=" + 'job_site' + "]").prop("disabled", false)
			}
		}
	});
}

function set_staffing_data(){
		frappe.call({
			method: "tag_workflow.utils.doctype_method.get_staffing_company_data", 
			callback: function(response) {
				frappe.meta.get_docfield('Pay Rates', 'staffing_company', cur_frm.doc.name).options = response.message;
				cur_frm.refresh_field('pay_rate')
			}
		})
}

function set_hiring_data(){	
	frappe.call({
		method: "tag_workflow.utils.doctype_method.get_hiring_company_data", 
		callback: function(response) {
			frappe.meta.get_docfield('Pay Rates', 'hiring_company', cur_frm.doc.name).options = response.message;
			cur_frm.refresh_field('pay_rate')
		}
	})

}

/*-------hide fields------------*/
function hide_fields(){
	let fields = ["gst_hsn_code","is_nil_exempt","is_non_gst","is_item_from_hub","allow_alternative_item","is_stock_item","include_item_in_manufacturing","opening_stock","valuation_rate","standard_rate","is_fixed_asset","auto_create_assets","asset_category","asset_naming_series","over_delivery_receipt_allowance","over_billing_allowance","image","brand","sb_barcodes","inventory_section","reorder_section","unit_of_measure_conversion","serial_nos_and_batches","variants_section","defaults","purchase_details","supplier_details","foreign_trade_details","sales_details","deferred_revenue","deferred_expense_section","customer_details","item_tax_section_break","inspection_criteria","manufacturing","hub_publishing_sb","more_information_section","stock_uom",'item_group','item_code','disabled','item_name','description'];
	for(let field in fields){
		cur_frm.toggle_display(fields[field], 0);
	}
}

function hide_connections(frm){
	frm.dashboard.hide();
}

function validate_form(frm){
	let error_fields = [], mandatory_fields = [];
	if(frappe.boot.tag.tag_user_info.company_type != 'TAG' && frappe.session.user != 'Administrator'){
		mandatory_fields = ['industry', 'job_titless', 'rate', 'company', 'descriptions'];
	}
	else{
		mandatory_fields = ['industry', 'job_titless', 'rate', 'descriptions'];
	}
	let message = __('<b>Please Fill Mandatory Fields to create a {0}:</b>', [__(frm.doc.doctype)]);
	mandatory_fields.forEach(field => {
		if (!frm.doc[field]) {
			if(field == 'job_titless'){
				error_fields.push('Job Title');
			}else{
				error_fields.push(frappe.unscrub(field));
			}
		}
	});
	if (error_fields && error_fields.length) {
		message = message + '<br><br><ul><li>' + error_fields.join('</li><li>') + "</ul>";
		frappe.msgprint({
			message: message,
			indicator: 'orange',
			title: __('Missing Fields')
		});
		frappe.validated = false;
	}
}

function readonly_fields(frm){
	if(frm.doc.__islocal!=1 && !(frappe.boot.tag.tag_user_info.company_type=='TAG' || frappe.session.user == 'Administrator')){
		let fields = ['industry', 'rate', 'company','job_titless', 'descriptions'];
		for (let i in fields){
			frm.set_df_property(fields[i], 'read_only', 1);
		}
	}
}

function read_only_company_field(frm){
	if(frm.doc.__islocal!=1 && (frappe.boot.tag.tag_user_info.company_type=='TAG' || frappe.session.user == 'Administrator')){
		if(frm.doc.company){
			frm.set_df_property('industry', 'read_only', 1);
			frm.set_df_property('company', 'read_only', 1);
		}
	}
}
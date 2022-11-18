frappe.require('/assets/tag_workflow/js/emp_functions.js');
frappe.ui.form.on('Employee Onboarding Template', {
    setup: (frm) => {
        frm.set_query('company', function(){
            return {
                filters: [
                    ['Company', 'organization_type', '=', 'Staffing'],
                    ['Company','make_organization_inactive','=',0]
                ]
            }
        });
        set_company(frm, 'company');
        get_user(frm, frm.doc.company);
	},
    refresh: (frm) => {
        frm.dashboard.hide();
        $('.form-footer').hide();
    },
    validate: (frm)=>{
        let reqd_fields = {'Company': frm.doc.company, 'Template Name': frm.doc.template_name, 'Activities': frm.doc.activities, };
        mandatory_fields(reqd_fields);
        if(frappe.validated){
            check_temp_name(frm);
        }
    },
    after_save: (frm)=>{
        if(frm.doc.default_template==1){
            frappe.db.get_list('Employee Onboarding Template', {
                filters: {
                    company: frm.doc.company,
                    name: ['!=', frm.doc.name],
                    default_template: 1
                },
                fields: ['name'],
            }).then(res => {
                if(res.length > 0){
                    for(let i in res){
                        frappe.db.set_value('Employee Onboarding Template', res[i].name, 'default_template', 0);
                    }
                }
            });
        }
    },
    company: (frm)=>{
        get_user(frm);
    }
});

frappe.ui.form.on('Employee Boarding Activity', {
	form_render: (frm, cdt, cdn)=>{
		check_count(frm, cdt, cdn);
	},
	document_required: (frm, cdt, cdn)=>{
		document_required(frm, cdt, cdn);
	},
	document: (frm, cdt, cdn)=>{
		document_field(frm, cdt, cdn);
	}
});

function check_temp_name(frm){
    frappe.db.get_value('Employee Onboarding Template', {'company': frm.doc.company, 'template_name': frm.doc.template_name, 'name': ['!=', frm.doc.name]}, ['name'], (res)=>{
        if(res && res.name){
            frappe.validated = false;
            frappe.msgprint({message: __('Template Name already exists for '+frm.doc.company+'.'), title: 'Warning', indicator: 'red'});
        }
    });
}

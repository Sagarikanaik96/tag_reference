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
        let reqd_fields = {'Activities': frm.doc.activities};
        mandatory_fields(reqd_fields);
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

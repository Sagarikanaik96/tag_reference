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

        $(document).on('click', '[data-fieldname="company"]', function(){
            companyhide(1250);
        });

        $('[data-fieldname="company"]').mouseover(function(){
            companyhide(1000);
        });

        document.addEventListener("keydown", function(){
            companyhide(1000);
        });
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

function companyhide(time) {
	setTimeout(() => {
		let txt  = $('[data-fieldname="company"]')[1].getAttribute('aria-owns');
		let txt2 = 'ul[id="'+txt+'"]';
		let  arry = document.querySelectorAll(txt2)[0].children;
		document.querySelectorAll(txt2)[0].children[arry.length-2].style.display='none';
		document.querySelectorAll(txt2)[0].children[arry.length-1].style.display='none';
	}, time);
}

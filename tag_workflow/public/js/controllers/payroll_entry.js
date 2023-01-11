frappe.ui.form.on('Payroll Entry',{
    refresh:(frm)=>{
        check_payroll_perm()
        setTimeout(()=>{
            check_status(frm)
        },200)
        
    },
    setup:function(frm){
		frm.set_query("company", function() {
			return {
				"filters":[ 
                    ['Company', "organization_type", "in", ["Staffing" ]],
                    ['Company',"make_organization_inactive","=",0],
                    ['Company',"enable_payroll","=",1]                
                ]
			}
		});
	},
})
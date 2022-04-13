frappe.listview_settings["Lead"] = {
    onload:function(){
        if(frappe.session.user!='Administrator'){
            $('.custom-actions.hidden-xs.hidden-md').hide();
            $('[data-original-title="Refresh"]').hide();
            $('.menu-btn-group').hide();
        }
        $('div[data-original-title = "Name"]').addClass('hide');
        $('[title = "Lead"]').html('Leads');
    },
    hide_name_column: true,
    refresh: ()=>{
        $('#navbar-breadcrumbs > li:nth-child(2) > a:nth-child(1)').html('Leads');
    }
}
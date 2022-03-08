frappe.listview_settings['Job Site'] = {
	onload:function(listview){
		$('h3[title = "Job Site"]').html('Job Sites');
		if(frappe.session.user!='Administrator'){
			$('.custom-actions.hidden-xs.hidden-md').hide();
			$('[data-original-title="Refresh"]').hide();
            $('.menu-btn-group').hide();
        }
    },
	refresh: function(){
		$('#navbar-breadcrumbs > li:nth-child(2) > a').html('Job Sites');
	}
}
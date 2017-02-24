function ClearRoadBillingPeriodRegistration() {
  if (!(this instanceof ClearRoadBillingPeriodRegistration)) {
      return new ClearRoadBillingPeriodRegistration();
    }
  // cleanup the local storage before each run
  var DATABASE = "cr-billing-period-registration";
//  indexedDB.deleteDatabase('jio:' + DATABASE);

  this.jio = jIO.createJIO({
    type: "replicate",
    use_remote_post: false,
    conflict_handling: 1,
    check_local_modification: false,
    check_local_creation: true,
    check_local_deletion: false,
    check_remote_modification: false,
    check_remote_creation: false,
    check_remote_deletion: false,
    local_sub_storage: {
      type: "mapping",
      map_id: ["equalSubProperty", "reference"],
      sub_storage: {
        type: "query",
        sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory",
            database: DATABASE
          }
        }
      }
    },
    remote_sub_storage: {
      type: "mapping",
      map_id: ["equalSubProperty", "reference"],
      mapping_dict: {"portal_type": ["equalValue", "Billing Period Message"],
                    "parent_relative_url": ["equalValue", "billing_period_message_module"]},
      sub_storage: {
        type: "erp5",
        url: "https://softinst69465.host.vifib.net/erp5/web_site_module/hateoas",
        default_view_reference: "jio_view"
      }
    }
  });
}
 
ClearRoadBillingPeriodRegistration.prototype = new ClearRoadBillingPeriodRegistration();

ClearRoadBillingPeriodRegistration.prototype.constructor = ClearRoadBillingPeriodRegistration;
ClearRoadBillingPeriodRegistration.prototype.post = function(){
  return this.jio.post.apply(this.jio, arguments);
};
ClearRoadBillingPeriodRegistration.prototype.sync = function(){
  return this.jio.repair.apply(this.jio, arguments);
};
module.exports = ClearRoadBillingPeriodRegistration


#import "QMAPoiDisplayVC.h"
#import "QMAPoi.h"
#import "QMATarget.h"

@interface QMAPoiDisplayVC ()

@property (nonatomic, weak) IBOutlet UILabel *poiLabel;
@property (nonatomic, weak) IBOutlet UILabel *targetLabel;

@end


@implementation QMAPoiDisplayVC

- (void)viewDidLoad {
    [super viewDidLoad];
    self.poiLabel.text = self.poi.label;
    self.targetLabel.text = self.poi.target.label;
}

- (IBAction)didTapToClose:(UIButton *)sender {
    [self.navigationController popViewControllerAnimated:YES];
}

@end

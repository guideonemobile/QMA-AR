
#import "QMAPoiVC.h"
#import "QMAPoi.h"
#import "QMATarget.h"


@interface QMAPoiVC ()


@property (nonatomic, weak) IBOutlet UIView *frameView;

@property (nonatomic, weak) IBOutlet UILabel *poiLabel;
@property (nonatomic, weak) IBOutlet UILabel *targetLabel;

@end


@implementation QMAPoiVC

- (void)viewDidLoad {
    
    [super viewDidLoad];
    
    //self.frameView.backgroundColor = [UIColor clearColor];
    
    self.poiLabel.text = self.poi.label;
    self.targetLabel.text = self.poi.target.label;
}


@end

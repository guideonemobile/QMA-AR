
#import "QMAPoiVC.h"
#import "QMAPoi.h"
#import "QMATarget.h"
#import <QuartzCore/QuartzCore.h>


@interface QMAPoiVC ()


@property (nonatomic, weak) IBOutlet UIView *frameView;

@property (nonatomic, weak) IBOutlet UIImageView *mainImageView;
@property (nonatomic, weak) IBOutlet UILabel *poiLabel;
@property (nonatomic, weak) IBOutlet UILabel *targetLabel;

@end


@implementation QMAPoiVC {
    
    BOOL _mainImageHasBeenMasked;
    
}

- (void)viewDidLoad {
    
    [super viewDidLoad];
    
    //self.frameView.backgroundColor = [UIColor clearColor];
    self.mainImageView.image = [UIImage imageNamed:self.poi.image];
 
    self.poiLabel.text = self.poi.label;
    self.targetLabel.text = self.poi.target.label;
}

- (void)viewWillAppear:(BOOL)animated {
    
    [super viewWillAppear:animated];
    
    if (!_mainImageHasBeenMasked) {
        
        _mainImageHasBeenMasked = YES;
        
        CALayer *mask = [CALayer layer];
        mask.contents = (id)[[UIImage imageNamed:@"poi_main_mask.png"] CGImage];
        mask.frame = CGRectMake(0, 0, self.mainImageView.frame.size.width, self.mainImageView.frame.size.height);
        self.mainImageView.layer.mask = mask;
        self.mainImageView.layer.masksToBounds = YES;
    }
}

@end

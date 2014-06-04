
#import "QMAGalleryVC.h"


@interface QMAGalleryVC ()

@property (nonatomic, weak) IBOutlet UIView *frameView;
@property (nonatomic, weak) IBOutlet UIScrollView *scrollView;
@property (nonatomic, weak) IBOutlet UIButton *closeButton;
@property (nonatomic, weak) IBOutlet UIButton *prevButton;
@property (nonatomic, weak) IBOutlet UIButton *nextButton;
@property (nonatomic, weak) IBOutlet UILabel *captionLabel;

@end


@implementation QMAGalleryVC

#pragma mark - Target Action

- (IBAction)didTapToCloseVC:(UIButton *)sender {
    [self dismissViewControllerAnimated:YES completion:^{
    }];
}

@end
